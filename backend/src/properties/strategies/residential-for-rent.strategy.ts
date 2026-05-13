import { CreatePropertyDto } from '../dto/create-property.dto';
import { PreparedListingData } from './property-listing.strategy';
import { ResidentialBaseStrategy } from './base.strategy';

export class ResidentialForRentStrategy extends ResidentialBaseStrategy {
  protected validateTypeAndStatusRules(dto: CreatePropertyDto): void {
    super.validateTypeAndStatusRules(dto);
    this.assertRentalPublishRules(dto);
  }

  prepareData(
    dto: CreatePropertyDto,
    willPublish: boolean,
  ): PreparedListingData {
    void willPublish;
    return this.prepareRentalData(dto);
  }
}
