import { User } from '../../users/entities/user.entity';

export enum PropertyType {
    APARTMENT = 'APARTMENT',
    HOUSE = 'HOUSE',
    STUDIO = 'STUDIO',
    COMMERCIAL = 'COMMERCIAL',
    LAND = 'LAND',
}

export class Listing {
    id: string;
    title: string;
    description: string;
    price: number;
    size: number;
    address: string;
    latitude?: number;
    longitude?: number;
    type: PropertyType;
    ownerId: string;
    owner?: User;
    images: string[];
    features: string[];
    videoUrl?: string;
    virtualTourUrl?: string;
    views: number;
    createdAt: Date;
    updatedAt: Date;
}
