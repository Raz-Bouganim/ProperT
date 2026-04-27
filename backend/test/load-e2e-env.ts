/** Runs before AppModule in e2e specs so Joi validation sees required env vars. */
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'e2e-dev-only-jwt-secret-min-16-chars';
}
