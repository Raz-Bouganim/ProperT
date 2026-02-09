export class User {
  id: string;
  email: string;
  password?: string; // Optional for social login users
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
