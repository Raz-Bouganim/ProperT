import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  ChatService,
  decodeMessageCursor,
  MAX_MESSAGE_PAGE_SIZE,
} from './chat.service';

describe('ChatService', () => {
  describe('decodeMessageCursor', () => {
    it('decodes a valid cursor', () => {
      const d = new Date('2020-01-01T00:00:00.000Z');
      const id = '550e8400-e29b-41d4-a716-446655440000';
      const raw = Buffer.from(
        JSON.stringify({ createdAt: d.toISOString(), id }),
        'utf8',
      ).toString('base64url');
      const out = decodeMessageCursor(raw);
      expect(out.id).toBe(id);
      expect(out.createdAt.getTime()).toBe(d.getTime());
    });

    it('throws on invalid cursor payload', () => {
      expect(() => decodeMessageCursor('@@@')).toThrow(BadRequestException);
    });
  });

  describe('getOrCreateConversation integrity', () => {
    it('rejects when ownerId does not match property owner', async () => {
      const prisma = {
        property: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'prop-1',
            ownerId: 'real-owner',
          }),
        },
        conversation: {
          findFirst: jest.fn(),
          create: jest.fn(),
        },
      };
      const service = new ChatService(prisma as never);
      await expect(
        service.getOrCreateConversation('prop-1', 'seeker-1', 'wrong-owner'),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.conversation.create).not.toHaveBeenCalled();
    });

    it('rejects self-conversation', async () => {
      const prisma = {
        property: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'prop-1',
            ownerId: 'owner-1',
          }),
        },
        conversation: {
          findFirst: jest.fn(),
          create: jest.fn(),
        },
      };
      const service = new ChatService(prisma as never);
      await expect(
        service.getOrCreateConversation('prop-1', 'owner-1', 'owner-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('pagination contract', () => {
    it('uses capped page size', () => {
      expect(MAX_MESSAGE_PAGE_SIZE).toBe(50);
    });
  });
});
