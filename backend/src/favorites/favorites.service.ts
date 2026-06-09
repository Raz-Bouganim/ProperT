import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { mapPropertyPublicResponse } from '../properties/property-public.mapper';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async toggle(
    userId: string,
    propertyId: string,
  ): Promise<{ isFavorited: boolean }> {
    return this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.favorite.findUnique({
          where: { userId_propertyId: { userId, propertyId } },
        });

        if (existing) {
          await tx.favorite.delete({
            where: { userId_propertyId: { userId, propertyId } },
          });
          return { isFavorited: false };
        }

        const property = await tx.property.findFirst({
          where: {
            id: propertyId,
            deletedAt: null,
            publishedAt: { not: null },
          },
        });
        if (!property) throw new NotFoundException('Property not found');
        if (property.ownerId === userId) {
          throw new ForbiddenException('You cannot favorite your own property');
        }

        await tx.favorite.create({ data: { userId, propertyId } });
        return { isFavorited: true };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async findAll(userId: string) {
    const rows = await this.prisma.favorite.findMany({
      where: {
        userId,
        property: { deletedAt: null, publishedAt: { not: null } },
      },
      include: {
        property: {
          include: {
            images: true,
            amenities: true,
            owner: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((f) => mapPropertyPublicResponse(f.property));
  }
}
