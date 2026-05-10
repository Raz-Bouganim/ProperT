import { CreatePropertyDto } from '../dto/create-property.dto';
import { PreparedListingData } from './property-listing.strategy';
import { BasePropertyStrategy } from './base.strategy';

export class OfficeForSaleStrategy extends BasePropertyStrategy {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected validateTypeAndStatusRules(_dto: CreatePropertyDto): void {}

  prepareData(dto: CreatePropertyDto, _willPublish: boolean): PreparedListingData {
    return {
      leaseMonths: null,
      availableFrom: dto.availableDate ? new Date(dto.availableDate) : null,
      bedrooms: null,
      bathrooms: null,
    };
  }
}
