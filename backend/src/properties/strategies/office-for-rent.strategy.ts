import { CreatePropertyDto } from '../dto/create-property.dto';
import { PreparedListingData } from './property-listing.strategy';
import { BasePropertyStrategy } from './base.strategy';

export class OfficeForRentStrategy extends BasePropertyStrategy {
  protected validateTypeAndStatusRules(dto: CreatePropertyDto): void {
    this.assertRentalPublishRules(dto);
  }

  prepareData(
    dto: CreatePropertyDto,
    willPublish: boolean,
  ): PreparedListingData {
    void willPublish;
    return { ...this.prepareRentalData(dto), bedrooms: null, bathrooms: null };
  }
}
