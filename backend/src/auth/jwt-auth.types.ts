/** Attached to `req.user` after JwtStrategy validates the bearer token. */
export interface JwtAuthUser {
  userId: string;
  email?: string;
}

/** JWT payload shape from `JwtService.sign` / Auth0 bridge. */
export interface JwtAccessPayload {
  sub: string;
  email?: string;
}
