import { User } from '../../users/entities/user.entity';

export enum PropertyType {
  APARTMENT = 'APARTMENT',
  HOUSE = 'HOUSE',
  OFFICE = 'OFFICE',
}

export enum PropertyStatus {
  FOR_SALE = 'FOR_SALE',
  FOR_RENT = 'FOR_RENT',
  CLOSED = 'CLOSED',
}

export class Property {
  id: string;
  title: string;
  description: string;
  status: PropertyStatus;
  price: number;
  negotiable: boolean;
  sqft: number;
  addressLine: string;
  city: string;
  country: string;
  region?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  type: PropertyType;
  ownerId: string;
  owner?: User;
  images: string[];
  amenities: string[];
  videoUrl?: string;
  virtualTourUrl?: string;
  views: number;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
