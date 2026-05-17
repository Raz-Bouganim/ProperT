import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { Auth0Service } from './auth0.service';
import { AUTH_USER_MESSAGES } from './auth-user-messages';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private auth0Service: Auth0Service,
  ) {}

  private useAuth0(): boolean {
    return this.auth0Service.isEnabled();
  }

  async issueAppTokens(user: User) {
    const publicUser = await this.usersService.findOnePublic(user.id) ?? this.usersService.toPublic(user);
    const payload = { email: publicUser.email, sub: publicUser.id };
    return {
      access_token: this.jwtService.sign(payload),
      user: publicUser,
    };
  }

  async refreshForUserId(userId: string) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.issueAppTokens(user);
  }

  validateUser(email: string, pass: string): Promise<User | null> {
    void email;
    void pass;
    // Local password auth removed — all auth goes through Auth0 (Phase 2 cleans this up fully).
    return Promise.resolve(null);
  }

  async loginWithCredentials(email: string, password: string) {
    const normalized = email.toLowerCase();
    if (this.useAuth0()) {
      try {
        const tokens = await this.auth0Service.loginWithPassword(
          normalized,
          password,
        );
        const profile = await this.auth0Service.getUserProfile(
          tokens.access_token,
        );
        const user =
          await this.usersService.findOrCreateFromAuth0Profile(profile);
        return this.issueAppTokens(user);
      } catch (e) {
        if (e instanceof UnauthorizedException) {
          const legacy = await this.validateUser(normalized, password);
          if (legacy) {
            return this.issueAppTokens(legacy);
          }
          throw new UnauthorizedException(AUTH_USER_MESSAGES.loginFailed);
        }
        throw e;
      }
    }
    const user = await this.validateUser(normalized, password);
    if (!user) {
      throw new UnauthorizedException(AUTH_USER_MESSAGES.loginFailed);
    }
    return this.issueAppTokens(user);
  }

  async register(userDto: CreateUserDto) {
    const existing = await this.usersService.findByEmail(userDto.email);
    if (existing) {
      throw new ConflictException(AUTH_USER_MESSAGES.signUpCouldNotComplete);
    }
    if (this.useAuth0()) {
      await this.auth0Service.signUp(
        userDto.email.toLowerCase(),
        userDto.password,
        userDto.firstName,
        userDto.lastName,
      );
      return this.loginWithCredentials(userDto.email, userDto.password);
    }
    const hashedPassword = await bcrypt.hash(userDto.password, 10);
    const user = await this.usersService.create({
      ...userDto,
      password: hashedPassword,
    });
    return this.issueAppTokens(user);
  }

  async completeOAuthCodeFlow(code: string, redirectUri: string) {
    if (!this.useAuth0()) {
      throw new BadRequestException('Auth0 is not configured on this server');
    }
    let tokens: { access_token: string };
    try {
      tokens = await this.auth0Service.exchangeAuthorizationCode(
        code,
        redirectUri,
      );
    } catch (e) {
      if (e instanceof UnauthorizedException || e instanceof BadRequestException) {
        throw new BadRequestException(AUTH_USER_MESSAGES.oauthExchangeFailed);
      }
      throw e;
    }
    const profile = await this.auth0Service.getUserProfile(tokens.access_token);
    const user = await this.usersService.findOrCreateFromAuth0Profile(profile);
    return this.issueAppTokens(user);
  }
}
