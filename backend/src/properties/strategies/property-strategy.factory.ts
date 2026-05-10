import { BadRequestException } from '@nestjs/common';
import { PropertyType, PropertyStatus } from '@prisma/client';
import { IPropertyListingStrategy } from './property-listing.strategy';
import { ResidentialForSaleStrategy } from './residential-for-sale.strategy';
import { ResidentialForRentStrategy } from './residential-for-rent.strategy';
import { OfficeForSaleStrategy } from './office-for-sale.strategy';
import { OfficeForRentStrategy } from './office-for-rent.strategy';

export class PropertyStrategyFactory {
  static for(type: PropertyType, status: PropertyStatus): IPropertyListingStrategy {
    if (type === PropertyType.APARTMENT || type === PropertyType.HOUSE) {
      return status === PropertyStatus.FOR_RENT
        ? new ResidentialForRentStrategy()
        : new ResidentialForSaleStrategy();
    }
    if (type === PropertyType.OFFICE) {
      return status === PropertyStatus.FOR_RENT
        ? new OfficeForRentStrategy()
        : new OfficeForSaleStrategy();
    }
    throw new BadRequestException(`Unsupported property type: ${type}`);
  }
}
