import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class OAuthExchangeDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  /** Must match the redirect_uri sent to Auth0 /authorize (e.g. http://localhost:3000/auth/callback). */
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  redirectUri: string;
}
