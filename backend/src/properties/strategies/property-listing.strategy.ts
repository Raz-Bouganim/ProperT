import { CreatePropertyDto } from '../dto/create-property.dto';

export interface PreparedListingData {
  leaseMonths: number | null;
  availableFrom: Date | null | undefined;
  /** null = strip from DB (irrelevant for this type); undefined = use DTO value */
  bedrooms: number | null | undefined;
  bathrooms: number | null | undefined;
}

export interface IPropertyListingStrategy {
  validateDraft(dto: CreatePropertyDto): void;
  validatePublish(dto: CreatePropertyDto): void;
  prepareData(dto: CreatePropertyDto, willPublish: boolean): PreparedListingData;
}
