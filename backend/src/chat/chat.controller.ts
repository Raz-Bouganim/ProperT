import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/auth.guards';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
    constructor(private chatService: ChatService) { }

    @Get('conversations')
    async getConversations(@Request() req: any) {
        return this.chatService.getConversations(req.user.userId);
    }

    @Get('conversations/:id')
    async getConversation(@Param('id') id: string) {
        return this.chatService.getConversation(id);
    }

    @Get('messages/:conversationId')
    async getMessages(@Param('conversationId') conversationId: string) {
        return this.chatService.getMessages(conversationId);
    }

    @Post('conversations')
    async getOrCreateConversation(
        @Request() req: any,
        @Body() body: { listingId: string, ownerId: string }
    ) {
        // Participant IDs: [Current User, Listing Owner]
        return this.chatService.getOrCreateConversation(
            body.listingId,
            [req.user.userId, body.ownerId]
        );
    }
}
