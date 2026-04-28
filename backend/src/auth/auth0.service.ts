import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

export type Auth0UserProfile = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
  name?: string;
};

@Injectable()
export class Auth0Service {
  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {}

  isEnabled(): boolean {
    const domain = this.config.get<string>('AUTH0_DOMAIN')?.trim();
    const clientId = this.config.get<string>('AUTH0_CLIENT_ID')?.trim();
    const secret = this.config.get<string>('AUTH0_CLIENT_SECRET')?.trim();
    return !!(domain && clientId && secret);
  }

  private issuerBase(): string {
    const raw = this.config.getOrThrow<string>('AUTH0_DOMAIN').trim();
    const host = raw.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `https://${host}`;
  }

  async getUserProfile(accessToken: string): Promise<Auth0UserProfile> {
    const res = await firstValueFrom(
      this.http.get<Auth0UserProfile>(`${this.issuerBase()}/userinfo`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    );
    return res.data;
  }

  async loginWithPassword(email: string, password: string): Promise<{ access_token: string }> {
    const client_id = this.config.getOrThrow<string>('AUTH0_CLIENT_ID');
    const client_secret = this.config.getOrThrow<string>('AUTH0_CLIENT_SECRET');
    const audience = this.config.get<string>('AUTH0_AUDIENCE')?.trim();
    const realm =
      this.config.get<string>('AUTH0_DB_CONNECTION')?.trim() ||
      'Username-Password-Authentication';
    const body: Record<string, string> = {
      // Without a realm (connection), Auth0 can throw:
      // "Authorization server not configured with default connection."
      grant_type: 'http://auth0.com/oauth/grant-type/password-realm',
      realm,
      username: email,
      password,
      client_id,
      client_secret,
      scope: 'openid profile email',
    };
    if (audience) {
      body.audience = audience;
    }
    try {
      const res = await firstValueFrom(
        this.http.post<{ access_token: string }>(`${this.issuerBase()}/oauth/token`, body, {
          headers: { 'content-type': 'application/json' },
        }),
      );
      return res.data;
    } catch (e) {
      this.rethrowAuth0(e);
    }
  }

  async signUp(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ): Promise<void> {
    const client_id = this.config.getOrThrow<string>('AUTH0_CLIENT_ID');
    const connection =
      this.config.get<string>('AUTH0_DB_CONNECTION')?.trim() ||
      'Username-Password-Authentication';
    try {
      await firstValueFrom(
        this.http.post(
          `${this.issuerBase()}/dbconnections/signup`,
          {
            client_id,
            email,
            password,
            connection,
            given_name: firstName,
            family_name: lastName,
            name: `${firstName} ${lastName}`.trim(),
          },
          { headers: { 'content-type': 'application/json' } },
        ),
      );
    } catch (e) {
      this.rethrowAuth0(e);
    }
  }

  async exchangeAuthorizationCode(
    code: string,
    redirectUri: string,
  ): Promise<{ access_token: string }> {
    const client_id = this.config.getOrThrow<string>('AUTH0_CLIENT_ID');
    const client_secret = this.config.getOrThrow<string>('AUTH0_CLIENT_SECRET');
    const body: Record<string, string> = {
      grant_type: 'authorization_code',
      client_id,
      client_secret,
      code,
      redirect_uri: redirectUri,
    };
    const audience = this.config.get<string>('AUTH0_AUDIENCE')?.trim();
    if (audience) {
      body.audience = audience;
    }
    try {
      const res = await firstValueFrom(
        this.http.post<{ access_token: string }>(`${this.issuerBase()}/oauth/token`, body, {
          headers: { 'content-type': 'application/json' },
        }),
      );
      return res.data;
    } catch (e) {
      this.rethrowAuth0(e);
    }
  }

  private rethrowAuth0(e: unknown): never {
    const err = e as AxiosError<{
      error?: string;
      error_description?: string;
      description?: string;
      message?: string | string[];
      code?: string;
    }>;
    const status = err.response?.status;
    const data = err.response?.data;
    const rawMsg =
      data?.description ||
      data?.error_description ||
      (Array.isArray(data?.message) ? data?.message[0] : data?.message) ||
      data?.error ||
      err.message ||
      'Auth0 request failed';
    const msg = typeof rawMsg === 'string' ? rawMsg : String(rawMsg);
    const lower = msg.toLowerCase();
    const oauthErr = data?.error;

    if (
      status === 401 ||
      status === 403 ||
      oauthErr === 'invalid_grant' ||
      lower.includes('wrong email or password') ||
      lower.includes('invalid user') ||
      lower.includes('wrong credentials')
    ) {
      throw new UnauthorizedException(msg);
    }
    if (
      lower.includes('already exists') ||
      lower.includes('user already exists') ||
      data?.code === 'user_exists'
    ) {
      throw new ConflictException(msg);
    }
    if (status === 409) {
      throw new ConflictException(msg);
    }
    throw new BadRequestException(msg);
  }
}
