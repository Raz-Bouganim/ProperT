/**
 * User-visible auth copy that avoids account enumeration where it matters:
 * the same outcome and wording for wrong password, unknown email, and social-only accounts.
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
