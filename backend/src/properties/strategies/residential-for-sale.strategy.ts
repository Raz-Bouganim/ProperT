import { CreatePropertyDto } from '../dto/create-property.dto';
import { PreparedListingData } from './property-listing.strategy';
import { ResidentialBaseStrategy } from './base.strategy';

export class ResidentialForSaleStrategy extends ResidentialBaseStrategy {
  prepareData(
    dto: CreatePropertyDto,
    willPublish: boolean,
  ): PreparedListingData {
    void willPublish;
    return {
      leaseMonths: null,
      availableFrom: dto.availableDate ? new Date(dto.availableDate) : null,
      bedrooms: undefined,
      bathrooms: undefined,
    };
  }
}
