import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './auth.guards';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthUser } from './jwt-auth.types';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { OAuthExchangeDto } from './dto/oauth-exchange.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.loginWithCredentials(
      loginDto.email,
      loginDto.password,
    );
  }

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  /** Exchange Auth0 authorization code (from /authorize callback) for ProperT JWT + user. */
  @Post('oauth/exchange')
  async oauthExchange(@Body() body: OAuthExchangeDto) {
    return this.authService.completeOAuthCodeFlow(body.code, body.redirectUri);
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  async refresh(@CurrentUser() user: JwtAuthUser) {
    return this.authService.refreshForUserId(user.userId);
  }
}
