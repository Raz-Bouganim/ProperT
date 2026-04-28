import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import type { Auth0UserProfile } from '../auth/auth0.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  async create(createUserDto: CreateUserDto) {
    return this.prisma.user.create({
      data: {
        ...createUserDto,
        email: createUserDto.email.toLowerCase(),
      },
    });
  }

  toPublic(user: User) {
    const { password: _password, ...rest } = user;
    return rest;
  }

  async findOnePublic(id: string) {
    const user = await this.findOne(id);
    return user ? this.toPublic(user) : null;
  }

  findAll() {
    return this.prisma.user.findMany();
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  async findOrCreateFromAuth0Profile(p: Auth0UserProfile) {
    if (!p.email) {
      throw new BadRequestException(
        'Auth0 did not return an email for this account. Try another provider or contact support.',
      );
    }
    const email = p.email.toLowerCase();
    const bySub = await this.prisma.user.findUnique({ where: { auth0Sub: p.sub } });
    if (bySub) {
      return bySub;
    }
    const byEmail = await this.findByEmail(email);
    if (byEmail) {
      if (byEmail.auth0Sub && byEmail.auth0Sub !== p.sub) {
        throw new ConflictException('This email is linked to a different account.');
      }
      return this.prisma.user.update({
        where: { id: byEmail.id },
        data: { auth0Sub: p.sub },
      });
    }
    const firstName = p.given_name || p.name?.split(/\s+/)[0] || 'User';
    const lastName =
      p.family_name || (p.name?.includes(' ') ? p.name.split(/\s+/).slice(1).join(' ') : '') || 'User';
    return this.prisma.user.create({
      data: {
        email,
        auth0Sub: p.sub,
        firstName,
        lastName,
        password: null,
      },
    });
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  remove(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }
}
