import { WebSocketGateway, SubscribeMessage, MessageBody, WebSocketServer, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('sendMessage')
  handleMessage(@MessageBody() data: { senderId: string, receiverId: string, content: string }, @ConnectedSocket() client: Socket) {
    // In a real app, save to DB here
    const message = {
      id: Math.random().toString(36).substr(2, 9),
      ...data,
      createdAt: new Date(),
    };

    // Emit to receiver (if connected) or broadcast for MVP
    this.server.emit('newMessage', message);
    return message;
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(@MessageBody() room: string, @ConnectedSocket() client: Socket) {
    client.join(room);
    return { event: 'joined', room };
  }
}
