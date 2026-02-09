import { User } from '../../users/entities/user.entity';

export enum PropertyType {
    APARTMENT = 'apartment',
    HOUSE = 'house',
    STUDIO = 'studio',
    COMMERCIAL = 'commercial',
}

export class Listing {
    id: string;
    title: string;
    description: string;
    price: number;
    size: number; // in sq meters or ft
    address: string;
    type: PropertyType;
    owner?: User;
    images: string[];
    features: string[]; // e.g. ['pool', 'genome']
    createdAt: Date;
    updatedAt: Date;
}
