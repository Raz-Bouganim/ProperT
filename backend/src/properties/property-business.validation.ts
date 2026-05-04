import { BadRequestException } from '@nestjs/common';
import { PropertyStatus, PropertyType } from '@prisma/client';
import { CreatePropertyDto } from './dto/create-property.dto';
import { parseLeaseDurationInput } from './property-lease.util';

function assertNonNegativeMetric(label: string, value: number | undefined) {
  if (value === undefined) return;
  if (value < 0) throw new BadRequestException(`${label} cannot be negative`);
}

function intentStatus(dto: CreatePropertyDto): PropertyStatus {
  return dto.status ?? PropertyStatus.FOR_SALE;
}

/** Draft save: minimal checks so incomplete properties can be stored. */
export function assertDraftPropertyRules(dto: CreatePropertyDto) {
  if (!dto.title?.trim()) throw new BadRequestException('Title is required');
  if (!dto.description?.trim()) throw new BadRequestException('Description is required');
  if (!dto.type) throw new BadRequestException('Property type is required');
  if (!dto.addressLine?.trim()) throw new BadRequestException('Address line is required');

  const intent = intentStatus(dto);
  if (intent !== PropertyStatus.FOR_SALE && intent !== PropertyStatus.FOR_RENT) {
    throw new BadRequestException('status must be FOR_SALE or FOR_RENT');
  }

  const p = Number(dto.price);
  if (!Number.isFinite(p) || p < 0) throw new BadRequestException('Price must be zero or positive for a draft');
  const s = Number(dto.sqft);
  if (!Number.isFinite(s) || s < 0) throw new BadRequestException('Square footage must be zero or positive for a draft');
}

/**
 * Publish / live listing: full checks on the single-table model.
 * Draft vs live is `publishedAt`, not `status`.
 */
export function assertPublishPropertyRules(dto: CreatePropertyDto) {
  const status = intentStatus(dto);
  if (status !== PropertyStatus.FOR_SALE && status !== PropertyStatus.FOR_RENT) {
    throw new BadRequestException('Published listings must be FOR_SALE or FOR_RENT');
  }

  if (dto.price <= 0) throw new BadRequestException('Price must be positive');
  if (dto.sqft <= 0) throw new BadRequestException('Square footage must be positive');

  assertNonNegativeMetric('Bedrooms', dto.bedrooms);
  assertNonNegativeMetric('Bathrooms', dto.bathrooms);

  const type = dto.type;

  if (type === PropertyType.APARTMENT || type === PropertyType.HOUSE) {
    if (dto.bedrooms == null || dto.bathrooms == null) {
      throw new BadRequestException('Bedrooms and bathrooms are required for apartments and houses');
    }
    if (dto.bedrooms <= 0 || dto.bathrooms <= 0) {
      throw new BadRequestException('Bedrooms and bathrooms must be greater than zero for apartments and houses');
    }
  }

  if (type === PropertyType.OFFICE) {
    if (dto.bedrooms != null && dto.bedrooms > 50) {
      throw new BadRequestException('Office listings: bedrooms value looks invalid');
    }
    if (dto.bathrooms != null && dto.bathrooms > 50) {
      throw new BadRequestException('Office listings: bathrooms value looks invalid');
    }
  }

  if (status === PropertyStatus.FOR_RENT) {
    if (!dto.availableDate?.trim()) {
      throw new BadRequestException('Rental listings require an available-from date');
    }
    const leaseStr = dto.leaseDuration?.trim() ?? '';
    if (!leaseStr) {
      throw new BadRequestException('Rental listings require a lease duration (or choose Flexible)');
    }
    const parsed = parseLeaseDurationInput(dto.leaseDuration);
    const flexible = /^flexible/i.test(leaseStr);
    if (parsed == null && !flexible) {
      throw new BadRequestException('Rental listings need a recognizable lease duration or Flexible / short term');
    }
  }
}
