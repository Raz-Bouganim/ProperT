'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { getAuth0CallbackRedirectUri } from '@/lib/auth0';

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();
  const ran = useRef(false);
  const [label, setLabel] = useState('Completing sign-in…');

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const fail = (msg: string) => {
      setLabel(msg);
      toast.error(msg);
      router.replace('/auth');
    };

    const err =
      searchParams.get('error_description') || searchParams.get('error');
    if (err) {
      fail(decodeURIComponent(err.replace(/\+/g, ' ')));
      return;
    }

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const stored = sessionStorage.getItem('auth0_oauth_state');
    sessionStorage.removeItem('auth0_oauth_state');
    if (!code || !state || !stored || stored !== state) {
      fail('Invalid sign-in callback. Please try again.');
      return;
    }

    const redirectUri = getAuth0CallbackRedirectUri();
    (async () => {
      try {
        const { data } = await api.post('/auth/oauth/exchange', {
          code,
          redirectUri,
        });
        login(data.access_token, data.user);
        const next = sessionStorage.getItem('auth0_post_login_redirect') || '/';
        sessionStorage.removeItem('auth0_post_login_redirect');
        toast.success('Welcome back!');
        router.replace(next);
      } catch (e: unknown) {
        const ax = e as { response?: { data?: { message?: string | string[] } } };
        const m = ax.response?.data?.message;
        const msg = Array.isArray(m) ? m[0] : m || 'Sign-in failed';
        fail(String(msg));
      }
    })();
  }, [login, router, searchParams]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f6f6f8]">
      <Loader2 className="h-10 w-10 animate-spin text-[#1754cf]" aria-hidden />
      <p className="text-sm font-medium text-[#636f88]">{label}</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f6f6f8]">
          <Loader2 className="h-10 w-10 animate-spin text-[#1754cf]" aria-label="Loading" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
