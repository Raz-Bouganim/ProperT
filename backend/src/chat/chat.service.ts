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
                property: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });
    }

    async getOrCreateConversation(propertyId: string, seekerId: string, ownerId: string) {
        const existing = await this.prisma.conversation.findFirst({
            where: { propertyId, seekerId, ownerId },
        });

        if (existing) return existing;

        return this.prisma.conversation.create({
            data: {
                property: { connect: { id: propertyId } },
                seeker: { connect: { id: seekerId } },
                owner: { connect: { id: ownerId } },
                participants: {
                    create: [{ userId: seekerId }, { userId: ownerId }],
                },
            },
        });
    }

    async saveMessage(conversationId: string, senderId: string, content: string) {
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
                property: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });
    }
}
