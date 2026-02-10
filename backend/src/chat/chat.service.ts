import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
    constructor(private prisma: PrismaService) { }

    async getConversations(userId: string) {
        return this.prisma.conversation.findMany({
            where: {
                participants: {
                    some: { userId },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                avatar: true,
                            },
                        },
                    },
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
                listing: {
                    select: {
                        id: true,
                        title: true,
                        images: true,
                    },
                },
            },
        });
    }

    async getOrCreateConversation(listingId: string, participantIds: string[]) {
        // Basic logic: find a conversation for this listing with these exact participants
        // For simplicity, we'll just check if one exists for these participants
        const existing = await this.prisma.conversation.findFirst({
            where: {
                listingId,
                participants: {
                    every: {
                        userId: { in: participantIds },
                    },
                },
            },
        });

        if (existing) return existing;

        return this.prisma.conversation.create({
            data: {
                listingId,
                participants: {
                    create: participantIds.map((id) => ({ userId: id })),
                },
            },
        });
    }

    async saveMessage(conversationId: string, senderId: string, content: string) {
        // Update conversation's updatedAt manually to ensure sorting works
        await this.prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
        });

        return this.prisma.message.create({
            data: {
                conversationId,
                senderId,
                content,
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatar: true,
                    },
                },
            },
        });
    }

    async getMessages(conversationId: string) {
        return this.prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'asc' },
            include: {
                sender: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatar: true,
                    },
                },
            },
        });
    }

    async getConversation(id: string) {
        return this.prisma.conversation.findUnique({
            where: { id },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                avatar: true,
                            },
                        },
                    },
                },
                listing: {
                    select: {
                        id: true,
                        title: true,
                        images: true,
                    },
                },
            },
        });
    }
}
