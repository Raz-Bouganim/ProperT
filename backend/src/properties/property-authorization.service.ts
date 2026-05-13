import { Injectable, NotFoundException } from '@nestjs/common';
import { Property } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Single source of truth for “this user may mutate this property”.
 * Used by {@link PropertiesService}. Wrong owner and missing rows both map to 404 to avoid ID probing.
 */
@Injectable()
export class PropertyAuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Loads a non–soft-deleted row owned by `userId`, or throws 404 (including wrong owner).
   */
  async requireWritableProperty(userId: string, propertyId: string): Promise<Property> {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, ownerId: userId, deletedAt: null },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    return property;
  }
}
