import { Injectable } from '@nestjs/common';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyType } from './entities/listing.entity';

@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaService) { }

  create(createListingDto: CreateListingDto) {
    return this.prisma.listing.create({
      data: {
        ...createListingDto,
        // Default values for simplified schema
        type: createListingDto.type.toString(),
        images: '[]',
        features: '[]',
      },
    });
  }

  findAll() {
    return this.prisma.listing.findMany();
  }

  findOne(id: string) {
    return this.prisma.listing.findUnique({ where: { id } });
  }

  update(id: string, updateListingDto: UpdateListingDto) {
    // Handle type enum to string conversion if present
    const data: any = { ...updateListingDto };
    if (data.type) data.type = data.type.toString();

    return this.prisma.listing.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.listing.delete({ where: { id } });
  }
}
