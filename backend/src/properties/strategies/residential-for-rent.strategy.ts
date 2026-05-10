import { CreatePropertyDto } from '../dto/create-property.dto';
import { PreparedListingData } from './property-listing.strategy';
import { ResidentialBaseStrategy } from './base.strategy';

export class ResidentialForRentStrategy extends ResidentialBaseStrategy {
  protected validateTypeAndStatusRules(dto: CreatePropertyDto): void {
    super.validateTypeAndStatusRules(dto);
    this.assertRentalPublishRules(dto);
  }

  prepareData(dto: CreatePropertyDto, _willPublish: boolean): PreparedListingData {
    return this.prepareRentalData(dto);
  }
}
