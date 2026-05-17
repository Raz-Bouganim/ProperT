import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ChatService, MAX_MESSAGE_PAGE_SIZE } from './chat.service';
import { JwtAuthGuard } from '../auth/auth.guards';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthUser } from '../auth/jwt-auth.types';
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
    @CurrentUser() user: JwtAuthUser,
    @Query() query: ConversationsQueryDto,
  ) {
    return this.chatService.getConversations(user.userId, query.folder ?? 'inbox');
  }

  @Get('conversations/:id')
  async getConversation(
    @CurrentUser() user: JwtAuthUser,
    @Param('id') id: string,
  ) {
    return this.chatService.getConversation(user.userId, id);
  }

  @Patch('conversations/:id')
  async patchConversation(
    @CurrentUser() user: JwtAuthUser,
    @Param('id') id: string,
    @Body() body: ArchiveConversationDto,
  ) {
    await this.chatService.setArchived(user.userId, id, body.archived);
    return { ok: true };
  }

  @Get('messages/:conversationId')
  async getMessages(
    @CurrentUser() user: JwtAuthUser,
    @Param('conversationId') conversationId: string,
    @Query() query: MessagesQueryDto,
  ) {
    const limit = query.limit ?? MAX_MESSAGE_PAGE_SIZE;
    return this.chatService.getMessagesPage(user.userId, conversationId, limit, query.cursor);
  }

  @Patch('messages/:messageId')
  async editMessage(
    @CurrentUser() user: JwtAuthUser,
    @Param('messageId') messageId: string,
    @Body() body: EditMessageDto,
  ) {
    return this.chatService.editMessage(messageId, user.userId, body.content);
  }

  @Post('conversations')
  async getOrCreateConversation(
    @CurrentUser() user: JwtAuthUser,
    @Body() body: CreateConversationDto,
  ) {
    return this.chatService.getOrCreateConversation(body.propertyId, user.userId, body.ownerId);
  }
}
