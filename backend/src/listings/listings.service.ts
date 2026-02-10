import { Injectable } from '@nestjs/common';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyType } from './entities/listing.entity';

@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaService) { }

  create(createListingDto: CreateListingDto) {
    const data: any = {
      ...createListingDto,
      price: createListingDto.price.toString(),
    };
    return this.prisma.listing.create({ data });
  }

  findAll() {
    return this.prisma.listing.findMany({
      include: { owner: true } as any,
      orderBy: { createdAt: 'desc' } as any,
    });
  }

  findOne(id: string) {
    return this.prisma.listing.findUnique({
      where: { id },
      include: { owner: true, availabilities: true } as any,
    });
  }

  update(id: string, updateListingDto: UpdateListingDto) {
    const { price, ...rest } = updateListingDto;
    const data: any = {
      ...rest,
      price: price ? price.toString() : undefined,
    };
    return this.prisma.listing.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.listing.delete({ where: { id } });
  }
}
