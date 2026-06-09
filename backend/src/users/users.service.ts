import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotImplementedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import type { Auth0UserProfile } from '../auth/auth0.service';
import { AUTH_USER_MESSAGES } from '../auth/auth-user-messages';
import { resolveAvatarUrl } from './user-avatar.util';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Local-password registration is replaced by Auth0 in Phase 2.
  create(createUserDto: CreateUserDto): Promise<User> {
    void createUserDto;
    return Promise.reject(
      new NotImplementedException(
        'User creation must go through the Auth0 OAuth flow.',
      ),
    );
  }

  toPublic(user: User) {
    return user;
  }

  async findOnePublic(id: string) {
    const user = await this.findOne(id);
    if (!user) return null;
    const propertyCount = await this.prisma.property.count({
      where: { ownerId: id, deletedAt: null },
    });
    return {
      ...this.toPublic(user),
      role: propertyCount > 0 ? 'OWNER' : 'SEEKER',
    };
  }

  findAll() {
    return this.prisma.user.findMany();
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  private namesFromAuth0Profile(p: Auth0UserProfile): {
    firstName: string;
    lastName: string;
  } {
    const firstName = p.given_name || p.name?.split(/\s+/)[0] || 'User';
    const lastName =
      p.family_name ||
      (p.name?.includes(' ') ? p.name.split(/\s+/).slice(1).join(' ') : '') ||
      'User';
    return { firstName, lastName };
  }

  async findOrCreateFromAuth0Profile(p: Auth0UserProfile) {
    if (!p.email) {
      throw new BadRequestException(AUTH_USER_MESSAGES.oauthProfileIncomplete);
    }
    const email = p.email.toLowerCase();
    const bySub = await this.prisma.user.findUnique({
      where: { externalId: p.sub },
    });
    if (bySub) {
      return bySub;
    }
    const byEmail = await this.findByEmail(email);
    if (byEmail) {
      if (byEmail.externalId === p.sub) {
        return byEmail;
      }
      throw new ConflictException(AUTH_USER_MESSAGES.oauthCannotUseThisMethod);
    }
    const { firstName, lastName } = this.namesFromAuth0Profile(p);
    const avatar = resolveAvatarUrl(p.picture, firstName, lastName);
    return this.prisma.user.create({
      data: {
        email,
        externalId: p.sub,
        firstName,
        lastName,
        avatar,
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
