import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ChatService, MAX_MESSAGE_PAGE_SIZE } from './chat.service';
import { JwtAuthGuard } from '../auth/auth.guards';
import { ArchiveConversationDto } from './dto/archive-conversation.dto';
import { ConversationsQueryDto } from './dto/conversations-query.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { EditMessageDto } from './dto/edit-message.dto';
import { MessagesQueryDto } from './dto/messages-query.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('conversations')
  async getConversations(
    @Request() req: { user: { userId: string } },
    @Query() query: ConversationsQueryDto,
  ) {
    return this.chatService.getConversations(
      req.user.userId,
      query.folder ?? 'inbox',
    );
  }

  @Get('conversations/:id')
  async getConversation(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.chatService.getConversation(req.user.userId, id);
  }

  @Patch('conversations/:id')
  async patchConversation(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() body: ArchiveConversationDto,
  ) {
    await this.chatService.setArchived(req.user.userId, id, body.archived);
    return { ok: true };
  }

  @Get('messages/:conversationId')
  async getMessages(
    @Request() req: { user: { userId: string } },
    @Param('conversationId') conversationId: string,
    @Query() query: MessagesQueryDto,
  ) {
    const limit = query.limit ?? MAX_MESSAGE_PAGE_SIZE;
    return this.chatService.getMessagesPage(
      req.user.userId,
      conversationId,
      limit,
      query.cursor,
    );
  }

  @Patch('messages/:messageId')
  async editMessage(
    @Request() req: { user: { userId: string } },
    @Param('messageId') messageId: string,
    @Body() body: EditMessageDto,
  ) {
    return this.chatService.editMessage(
      messageId,
      req.user.userId,
      body.content,
    );
  }

  @Post('conversations')
  async getOrCreateConversation(
    @Request() req: { user: { userId: string } },
    @Body() body: CreateConversationDto,
  ) {
    return this.chatService.getOrCreateConversation(
      body.propertyId,
      req.user.userId,
      body.ownerId,
    );
  }
}
