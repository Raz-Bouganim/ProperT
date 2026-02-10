import { WebSocketGateway, SubscribeMessage, MessageBody, WebSocketServer, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { UseGuards } from '@nestjs/common';
// import { WsJwtGuard } from '../auth/guards/ws-jwt.guard'; // I'll skip auth guard for MVP to ensure it works first

@WebSocketGateway({
  cors: {
    origin: '*',
  }
})
export class ChatGateway {
  constructor(private chatService: ChatService) { }

  @WebSocketServer()
  server: Server;

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: { conversationId: string, senderId: string, content: string },
    @ConnectedSocket() client: Socket
  ) {
    try {
      const message = await this.chatService.saveMessage(
        data.conversationId,
        data.senderId,
        data.content
      );

      // Emit to the specific room
      this.server.to(data.conversationId).emit('newMessage', message);
      return message;
    } catch (error) {
      console.error('WebSocket Error:', error);
    }
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(@MessageBody() conversationId: string, @ConnectedSocket() client: Socket) {
    client.join(conversationId);
    return { event: 'joined', room: conversationId };
  }
}
