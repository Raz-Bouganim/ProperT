import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MediaType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ConversationFolder } from './dto/conversations-query.dto';

const PREVIEW_MAX = 512;
export const MAX_MESSAGE_PAGE_SIZE = 50;

const messageInclude = {
  sender: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatar: true,
    },
  },
  replyToMessage: {
    select: {
      id: true,
      content: true,
      senderId: true,
      createdAt: true,
      sender: {
        select: { firstName: true, lastName: true },
      },
    },
  },
} as const;

function encodeCursor(c: { createdAt: Date; id: string }): string {
  return Buffer.from(
    JSON.stringify({ createdAt: c.createdAt.toISOString(), id: c.id }),
    'utf8',
  ).toString('base64url');
}

export function decodeMessageCursor(raw: string): {
  createdAt: Date;
  id: string;
} {
  let parsed: unknown;
  try {
    const json = Buffer.from(raw, 'base64url').toString('utf8');
    parsed = JSON.parse(json);
  } catch {
    throw new BadRequestException('Invalid cursor');
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new BadRequestException('Invalid cursor');
  }
  const o = parsed as Record<string, unknown>;
  const createdAt = new Date(String(o.createdAt));
  const id = String(o.id);
  if (Number.isNaN(createdAt.getTime()) || !id) {
    throw new BadRequestException('Invalid cursor');
  }
  return { createdAt, id };
}

function previewFromMessage(
  content: string | null,
  mediaUrl: string | null,
): string {
  const t = content?.trim();
  if (t) {
    return t.length > PREVIEW_MAX ? t.slice(0, PREVIEW_MAX) : t;
  }
  if (mediaUrl) {
    return '[attachment]';
  }
  return '';
}

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async ensureParticipant(userId: string, conversationId: string) {
    const row = await this.prisma.conversationParticipant.findUnique({
      where: {
        userId_conversationId: { userId, conversationId },
      },
      select: { userId: true },
    });
    if (!row) {
      throw new ForbiddenException('Not a participant in this conversation');
    }
  }

  async getConversations(userId: string, folder: ConversationFolder = 'inbox') {
    const archivedFilter =
      folder === 'archived'
        ? { archivedAt: { not: null } }
        : { archivedAt: null };

    const conversations = await this.prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId,
            ...archivedFilter,
          },
        },
      },
      orderBy: [
        { lastMessageAt: { sort: 'desc', nulls: 'last' } },
        { updatedAt: 'desc' },
      ],
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

    if (conversations.length === 0) return [];

    const ids = conversations.map((c) => c.id);
    const unreadRows = await this.prisma.$queryRaw<
      { conversation_id: string; unread_count: bigint }[]
    >`
      SELECT
        m.conversation_id::text AS conversation_id,
        COUNT(m.id)             AS unread_count
      FROM messages m
      JOIN conversation_participants cp
        ON  cp.conversation_id = m.conversation_id
        AND cp.user_id::text   = ${userId}
      WHERE
            m.conversation_id::text = ANY(${ids})
        AND m.sender_id::text      != ${userId}
        AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
      GROUP BY m.conversation_id
    `;

    const unreadMap = new Map(
      unreadRows.map((r) => [r.conversation_id, Number(r.unread_count)]),
    );

    return conversations.map((conv) => ({
      ...conv,
      unreadCount: unreadMap.get(conv.id) ?? 0,
    }));
  }

  async markConversationRead(userId: string, conversationId: string) {
    await this.ensureParticipant(userId, conversationId);

    const latest = await this.prisma.message.findFirst({
      where: { conversationId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true },
    });

    if (!latest) return;

    await this.prisma.conversationParticipant.update({
      where: { userId_conversationId: { userId, conversationId } },
      data: {
        lastReadMessageId: latest.id,
        lastReadAt: new Date(),
      },
    });
  }

  async getOrCreateConversation(
    propertyId: string,
    seekerId: string,
    ownerId: string,
  ) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, deletedAt: null },
      select: { id: true, ownerId: true },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    if (property.ownerId !== ownerId) {
      throw new ForbiddenException('Owner does not match this listing');
    }
    if (seekerId === ownerId) {
      throw new BadRequestException(
        'Cannot start a conversation with yourself',
      );
    }

    const existing = await this.prisma.conversation.findFirst({
      where: { propertyId, seekerId, ownerId },
    });

    if (existing) {
      return existing;
    }

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

  async saveMessage(
    conversationId: string,
    senderId: string,
    input: {
      content?: string | null;
      mediaUrl?: string | null;
      mediaType?: MediaType | null;
      replyToMessageId?: string;
    },
  ) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, seekerId: true, ownerId: true },
    });
    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }
    if (senderId !== conv.seekerId && senderId !== conv.ownerId) {
      throw new ForbiddenException('Not a participant in this conversation');
    }

    const replyToMessageId = input.replyToMessageId;
    if (replyToMessageId) {
      const parent = await this.prisma.message.findFirst({
        where: { id: replyToMessageId, conversationId },
        select: { id: true },
      });
      if (!parent) {
        throw new BadRequestException(
          'Reply must reference a message in this conversation',
        );
      }
    }

    const trimmedContent = (input.content ?? '').trim();
    const trimmedMedia = (input.mediaUrl ?? '').trim();

    if (!trimmedContent && !trimmedMedia) {
      throw new BadRequestException(
        'Message must include non-empty text or media',
      );
    }

    if (trimmedMedia && !input.mediaType) {
      throw new BadRequestException(
        'mediaType is required when mediaUrl is provided',
      );
    }

    if (input.mediaType && !trimmedMedia) {
      throw new BadRequestException(
        'mediaUrl is required when mediaType is provided',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: {
          conversationId,
          senderId,
          content: trimmedContent || null,
          mediaUrl: trimmedMedia || null,
          mediaType: trimmedMedia ? input.mediaType! : null,
          replyToMessageId: replyToMessageId ?? null,
        },
        include: messageInclude,
      });

      const preview = previewFromMessage(msg.content, msg.mediaUrl);

      await Promise.all([
        tx.conversation.update({
          where: { id: conversationId },
          data: {
            updatedAt: new Date(),
            lastMessageAt: msg.createdAt,
            lastMessagePreview: preview || null,
          },
        }),
        tx.conversationParticipant.update({
          where: { userId_conversationId: { userId: senderId, conversationId } },
          data: { lastReadMessageId: msg.id, lastReadAt: new Date() },
        }),
      ]);

      return msg;
    });
  }

  async getMessagesPage(
    userId: string,
    conversationId: string,
    limit: number,
    cursor?: string,
  ) {
    await this.ensureParticipant(userId, conversationId);

    const take = Math.min(
      Math.max(limit || MAX_MESSAGE_PAGE_SIZE, 1),
      MAX_MESSAGE_PAGE_SIZE,
    );

    const olderThan = cursor ? decodeMessageCursor(cursor) : null;

    const where = olderThan
      ? {
          conversationId,
          OR: [
            { createdAt: { lt: olderThan.createdAt } },
            {
              AND: [
                { createdAt: olderThan.createdAt },
                { id: { lt: olderThan.id } },
              ],
            },
          ],
        }
      : { conversationId };

    const rows = await this.prisma.message.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      include: messageInclude,
    });

    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    const items = [...page].reverse();

    const oldest = page.length > 0 ? page[page.length - 1] : null;
    const nextCursor =
      hasMore && oldest
        ? encodeCursor({ createdAt: oldest.createdAt, id: oldest.id })
        : null;

    return { items, nextCursor };
  }

  async getConversation(userId: string, id: string) {
    await this.ensureParticipant(userId, id);

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

  async setArchived(userId: string, conversationId: string, archived: boolean) {
    await this.ensureParticipant(userId, conversationId);

    await this.prisma.conversationParticipant.update({
      where: {
        userId_conversationId: { userId, conversationId },
      },
      data: {
        archivedAt: archived ? new Date() : null,
      },
    });
  }

  async editMessage(messageId: string, editorId: string, rawContent: string) {
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        conversationId: true,
        senderId: true,
        content: true,
        mediaUrl: true,
      },
    });
    if (!msg) {
      throw new NotFoundException('Message not found');
    }
    if (msg.senderId !== editorId) {
      throw new ForbiddenException('Only the sender can edit this message');
    }

    const trimmed = rawContent.trim();
    if (!trimmed && !msg.mediaUrl) {
      throw new BadRequestException('Message must have text or media');
    }

    await this.ensureParticipant(editorId, msg.conversationId);

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        content: trimmed || null,
        editedAt: new Date(),
      },
      include: messageInclude,
    });

    const latest = await this.prisma.message.findFirst({
      where: { conversationId: msg.conversationId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true },
    });

    const preview = previewFromMessage(updated.content, updated.mediaUrl);

    if (latest?.id === messageId) {
      await this.prisma.conversation.update({
        where: { id: msg.conversationId },
        data: {
          updatedAt: new Date(),
          lastMessagePreview: preview || null,
        },
      });
    } else {
      await this.prisma.conversation.update({
        where: { id: msg.conversationId },
        data: { updatedAt: new Date() },
      });
    }

    return updated;
  }
}
