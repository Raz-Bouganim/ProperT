import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MediaType } from '@prisma/client';
import { ChatService } from './chat.service';

type SocketData = {
  userId?: string;
};

function extractBearerToken(client: Socket): string | null {
  const auth = client.handshake.auth as { token?: string } | undefined;
  if (auth?.token && typeof auth.token === 'string' && auth.token.length > 0) {
    return auth.token;
  }
  const raw = client.handshake.headers.authorization;
  if (typeof raw === 'string' && raw.startsWith('Bearer ')) {
    return raw.slice('Bearer '.length).trim();
  }
  return null;
}

function parseMediaType(raw: unknown): MediaType | undefined {
  if (typeof raw !== 'string' || !raw.length) {
    return undefined;
  }
  const values = Object.values(MediaType) as string[];
  return values.includes(raw) ? (raw as MediaType) : undefined;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket) {
    const token = extractBearerToken(client);
    if (!token) {
      this.logger.debug('WebSocket connect rejected: no token');
      client.disconnect(true);
      return;
    }
    try {
      const payload = await this.jwtService.verifyAsync<{ sub?: string }>(
        token,
      );
      if (!payload?.sub) {
        client.disconnect(true);
        return;
      }
      (client.data as SocketData).userId = payload.sub;
    } catch {
      this.logger.debug('WebSocket connect rejected: invalid token');
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client.data as SocketData).userId;
    if (!userId) return;
    client.rooms.forEach((room) => {
      if (room !== client.id) {
        client.to(room).emit('partnerOffline', { userId });
      }
    });
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      conversationId: string;
      content?: string;
      mediaUrl?: string;
      mediaType?: string;
      replyToMessageId?: string;
    },
  ) {
    const userId = (client.data as SocketData).userId;
    if (!userId) {
      throw new WsException('Unauthorized');
    }
    if (!data?.conversationId) {
      throw new WsException('conversationId is required');
    }

    const hasText =
      typeof data.content === 'string' && data.content.trim().length > 0;
    const hasMediaUrl =
      typeof data.mediaUrl === 'string' && data.mediaUrl.trim().length > 0;
    const mediaType = parseMediaType(data.mediaType);
    if (hasMediaUrl && !mediaType) {
      throw new WsException(
        'mediaType must be a valid MediaType when mediaUrl is set',
      );
    }
    if (mediaType && !hasMediaUrl) {
      throw new WsException('mediaUrl is required when mediaType is set');
    }
    if (!hasText && !hasMediaUrl) {
      throw new WsException('Message must include text or media');
    }

    try {
      const message = await this.chatService.saveMessage(
        data.conversationId,
        userId,
        {
          content: hasText ? data.content : null,
          mediaUrl: hasMediaUrl ? data.mediaUrl!.trim() : null,
          mediaType: hasMediaUrl ? mediaType! : null,
          replyToMessageId: data.replyToMessageId,
        },
      );
      this.server.to(data.conversationId).emit('newMessage', message);
      return message;
    } catch (e) {
      if (e instanceof BadRequestException) {
        throw new WsException(e.message);
      }
      if (e instanceof ForbiddenException) {
        throw new WsException('Forbidden');
      }
      if (e instanceof NotFoundException) {
        throw new WsException('Not found');
      }
      this.logger.error('WebSocket sendMessage error', e);
      throw new WsException('Could not send message');
    }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() conversationId: string,
  ) {
    const userId = (client.data as SocketData).userId;
    if (!userId) {
      throw new WsException('Unauthorized');
    }
    if (!conversationId || typeof conversationId !== 'string') {
      throw new WsException('conversationId is required');
    }
    try {
      await this.chatService.ensureParticipant(userId, conversationId);
    } catch (e) {
      if (e instanceof ForbiddenException) {
        throw new WsException('Forbidden');
      }
      throw e;
    }
    void client.join(conversationId);
    client.to(conversationId).emit('partnerOnline', { userId });
    return { event: 'joined', room: conversationId };
  }
}
