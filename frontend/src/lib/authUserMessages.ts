/**
 * Mirrors `backend/src/auth/auth-user-messages.ts` for client fallbacks.
 * Prefer API error bodies when present; use these when status alone is known.
 */
export const AUTH_USER_MESSAGES = {
  loginFailed:
    'Could not sign you in. Check your email and password, or use Google or Apple.',

  signUpCouldNotComplete:
    'Could not complete sign-up. Try signing in, or use Google or Apple.',

  oauthCannotUseThisMethod:
    'Sign-in could not be completed. Try another option on the sign-in page.',

  oauthProfileIncomplete:
    'Sign-in could not be completed. Try another provider or contact support.',

  oauthExchangeFailed:
    'Sign-in could not be completed. Please start again from the sign-in page.',
} as const;
