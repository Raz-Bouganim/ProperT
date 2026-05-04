import { User } from '../../users/entities/user.entity';

export class Message {
  id: string;
  content: string;
  sender: User;
  receiverId: string; // simpler linking
  createdAt: Date;
  read: boolean;
}
