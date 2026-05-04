import { BadRequestException } from '@nestjs/common';
import { PropertyStatus, PropertyType } from '@prisma/client';
import { CreatePropertyDto } from './dto/create-property.dto';

function assertNonNegativeMetric(label: string, value: number | undefined) {
  if (value === undefined) return;
  if (value < 0) throw new BadRequestException(`${label} cannot be negative`);
}

/** Draft save: minimal checks so incomplete listings can be stored. */
export function assertDraftPropertyRules(dto: CreatePropertyDto) {
  if (!dto.title?.trim()) throw new BadRequestException('Title is required');
  if (!dto.description?.trim()) throw new BadRequestException('Description is required');
  if (!dto.type) throw new BadRequestException('Property type is required');
  if (!dto.address?.trim()) throw new BadRequestException('Address is required');
  if (dto.draftTargetStatus != null) {
    if (
      dto.draftTargetStatus !== PropertyStatus.FOR_SALE
      && dto.draftTargetStatus !== PropertyStatus.FOR_RENT
    ) {
      throw new BadRequestException('draftTargetStatus must be FOR_SALE or FOR_RENT');
    }
  }
  const p = Number(dto.price);
  if (!Number.isFinite(p) || p < 0) throw new BadRequestException('Price must be zero or positive for a draft');
  const s = Number(dto.sqft);
  if (!Number.isFinite(s) || s < 0) throw new BadRequestException('Square footage must be zero or positive for a draft');
}

/**
 * Publish / live listing: full checks on the single-table model.
 */
export function assertCreatePropertyBusinessRules(dto: CreatePropertyDto) {
  const status = dto.status ?? PropertyStatus.DRAFT;
  const type = dto.type;

  if (dto.price <= 0) throw new BadRequestException('Price must be positive');
  if (dto.sqft <= 0) throw new BadRequestException('Square footage must be positive');

  assertNonNegativeMetric('Bedrooms', dto.bedrooms);
  assertNonNegativeMetric('Bathrooms', dto.bathrooms);

  if (type === PropertyType.OFFICE) {
    if (dto.bedrooms > 50 || dto.bathrooms > 50) {
      throw new BadRequestException('Office listings: beds/baths look invalid');
    }
  }

  if (status === PropertyStatus.FOR_RENT) {
    if (!dto.availableDate?.trim()) {
      throw new BadRequestException('Rental listings require an available-from date');
    }
  }
}
