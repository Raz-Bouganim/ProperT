import { BadRequestException } from '@nestjs/common';
import { CreatePropertyDto } from '../dto/create-property.dto';
import { parseLeaseDurationInput } from '../property-lease.util';
import { IPropertyListingStrategy, PreparedListingData } from './property-listing.strategy';

export abstract class BasePropertyStrategy implements IPropertyListingStrategy {
  validateDraft(dto: CreatePropertyDto): void {
    if (!dto.title?.trim()) throw new BadRequestException('Title is required');
    if (!dto.description?.trim()) throw new BadRequestException('Description is required');
    if (!dto.addressLine?.trim()) throw new BadRequestException('Address line is required');
    const p = Number(dto.price);
    if (!Number.isFinite(p) || p < 0) throw new BadRequestException('Price must be zero or positive for a draft');
    const s = Number(dto.sqft);
    if (!Number.isFinite(s) || s < 0) throw new BadRequestException('Square footage must be zero or positive for a draft');
  }

  validatePublish(dto: CreatePropertyDto): void {
    if (dto.price <= 0) throw new BadRequestException('Price must be positive');
    if (dto.sqft <= 0) throw new BadRequestException('Square footage must be positive');
    this.validateTypeAndStatusRules(dto);
  }

  protected abstract validateTypeAndStatusRules(dto: CreatePropertyDto): void;

  abstract prepareData(dto: CreatePropertyDto, willPublish: boolean): PreparedListingData;

  protected assertRentalPublishRules(dto: CreatePropertyDto): void {
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

  protected prepareRentalData(dto: CreatePropertyDto): PreparedListingData {
    return {
      leaseMonths: parseLeaseDurationInput(dto.leaseDuration),
      availableFrom: dto.availableDate ? new Date(dto.availableDate) : undefined,
      bedrooms: undefined,
      bathrooms: undefined,
    };
  }
}

export abstract class ResidentialBaseStrategy extends BasePropertyStrategy {
  protected validateTypeAndStatusRules(dto: CreatePropertyDto): void {
    if (dto.bedrooms == null || dto.bathrooms == null) {
      throw new BadRequestException('Bedrooms and bathrooms are required for apartments and houses');
    }
    if (dto.bedrooms <= 0 || dto.bathrooms <= 0) {
      throw new BadRequestException('Bedrooms and bathrooms must be greater than zero for apartments and houses');
    }
  }
}
