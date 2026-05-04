import { IsIn, IsOptional } from 'class-validator';

export type ConversationFolder = 'inbox' | 'archived';

export class ConversationsQueryDto {
  @IsOptional()
  @IsIn(['inbox', 'archived'])
  folder?: ConversationFolder;
}
