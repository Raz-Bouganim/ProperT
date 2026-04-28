export const AUTH_CALLBACK_PATH = '/auth/callback';

export function getAuth0CallbackRedirectUri(): string {
  return `${window.location.origin}${AUTH_CALLBACK_PATH}`;
}

export type Auth0SocialConnection = 'google-oauth2' | 'apple';

/**
 * Redirects the browser to Auth0 /authorize for the given social connection.
 * @returns false if public Auth0 env is missing (caller should show a toast).
 */
export function startAuth0SocialLogin(
  connection: Auth0SocialConnection,
  postLoginRedirect: string,
): boolean {
  const rawDomain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN?.trim();
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID?.trim();
  if (!rawDomain || !clientId) {
    return false;
  }
  const domain = rawDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const redirectUri = getAuth0CallbackRedirectUri();
  const state = crypto.randomUUID();
  sessionStorage.setItem('auth0_oauth_state', state);
  sessionStorage.setItem('auth0_post_login_redirect', postLoginRedirect);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid profile email',
    connection,
    state,
  });
  window.location.href = `https://${domain}/authorize?${params.toString()}`;
  return true;
}
