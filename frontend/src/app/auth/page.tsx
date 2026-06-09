'use client';

import { Suspense, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { extractApiErrorMessage } from '@/lib/apiErrorMessage';
import { AUTH_USER_MESSAGES } from '@/lib/authUserMessages';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { startAuth0SocialLogin } from '@/lib/auth0';

type AuthMode = 'login' | 'register';

function AuthPageContent() {
    // Mode state initialized later
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { login: saveAuth } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectUrl = searchParams.get('redirect') || '/';
    const initialMode = (searchParams.get('mode') as AuthMode) || 'login';

    // Only 'login' or 'register' are valid modes
    const [mode, setMode] = useState<AuthMode>(
        ['login', 'register'].includes(initialMode) ? initialMode : 'login'
    );

    // Update mode state when URL param changes changes
    useEffect(() => {
        const modeParam = searchParams.get('mode');
        if (modeParam === 'login' || modeParam === 'register') {
            setMode(modeParam);
        }
    }, [searchParams]);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const body = mode === 'login'
            ? { email: formData.email, password: formData.password }
            : formData;

        try {
            const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
            const { data } = await api.post(endpoint, body);

            toast.success(mode === 'login' ? 'Welcome back!' : 'Account created successfully!');
            saveAuth(data.access_token, data.user);
            router.push(redirectUrl);
        } catch (err: unknown) {
            const responseData = axios.isAxiosError(err) ? err.response?.data : undefined;

            let finalMsg = extractApiErrorMessage(responseData);

            if (axios.isAxiosError(err) && err.response?.status === 401) {
                if (mode === 'login') {
                    finalMsg = AUTH_USER_MESSAGES.loginFailed;
                } else if (
                    !finalMsg ||
                    finalMsg.toLowerCase() === 'unauthorized'
                ) {
                    finalMsg = AUTH_USER_MESSAGES.signUpCouldNotComplete;
                }
            }

            const statusText = axios.isAxiosError(err) ? err.response?.statusText : undefined;
            const errMessage = err instanceof Error ? err.message : undefined;
            finalMsg =
                finalMsg ||
                statusText ||
                errMessage ||
                (mode === 'login'
                    ? AUTH_USER_MESSAGES.loginFailed
                    : AUTH_USER_MESSAGES.signUpCouldNotComplete);
            toast.error(finalMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSocial = (connection: 'google-oauth2' | 'apple') => {
        if (!startAuth0SocialLogin(connection, redirectUrl)) {
            toast.error('Social sign-in is not configured.');
        }
    };

    return (
        <div className="flex min-h-screen bg-[#f6f6f8] relative">
            {/* Left Side - Hero Section */}
            <div className="hidden lg:flex lg:w-1/2 overflow-hidden bg-[#1754cf] h-screen sticky top-0">
                <div className="absolute inset-0">
                    <Image
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDVGyKMT0fyBfT4z-son5GzfQ45JnVwzYaq8J_DRRiwLRZrE1J0ekENFk0fpY3XqmQtHsqzoVOyXkAuLvSqp1sxNj_XPfq13LKE6WQIuObsfILOnkxQrFwE6iEH3MrEmqbv8_zDXG4CPEesVHModChzSJTzzTYZwT5rPLrit7rh-JyT9R6IEuXnn249vyLeeZ0_ZSN4-jZP8Qnap2XQj_ecSo6Xws4c50yyF1cND57Q7fwOhCrA2UZ5ivLDnszYFKwmejusow3QUTo"
                        alt="Modern luxury residential glass architecture during sunset"
                        fill
                        className="object-cover opacity-80"
                        priority
                    />
                </div>
                <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#1754cf]/80 to-transparent" />

                <div className="relative z-20 flex flex-col justify-between h-full p-12 text-white w-full">
                    <Link href="/" className="flex items-center gap-3 group w-fit cursor-pointer">
                        <div className="bg-white text-[#1754cf] p-2 rounded-lg transition-transform group-hover:scale-105">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <span className="text-2xl font-bold tracking-tight">ProperT</span>
                    </Link>

                    <div className="max-w-md">
                        <h1 className="text-5xl font-bold leading-tight mb-6">
                            Find your perfect match in property.
                        </h1>
                        <p className="text-lg text-white/90 leading-relaxed">
                            Join thousands of investors and homeowners who trust ProperT for high-fidelity real estate data and seamless transactions.
                        </p>
                    </div>

                    <div className="text-sm font-medium text-white/60 flex gap-6">
                        <span>© 2026 ProperT Inc.</span>
                        <Link href="#" className="hover:text-white transition-colors cursor-pointer">Privacy Policy</Link>
                        <Link href="#" className="hover:text-white transition-colors cursor-pointer">Terms of Service</Link>
                    </div>
                </div>
            </div>

            {/* Right Side - Auth Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 lg:px-24 py-12 bg-white">
                <div className="max-w-md w-full mx-auto">
                    {/* Welcome Text */}
                    <div className="mb-10 text-left">
                        <h2 className="text-3xl font-bold text-[#111318] mb-2">Welcome back</h2>
                        <p className="text-[#636f88] font-medium">Enter your credentials to access your account</p>
                    </div>

                    {/* Mode Switcher */}
                    <div className="flex border-b border-[#dcdfe5] w-full mb-8">
                        <button
                            onClick={() => setMode('login')}
                            className={cn(
                                "flex-1 pb-3 text-sm font-bold transition-all relative cursor-pointer",
                                mode === 'login' ? "text-[#1754cf] border-b-[3px] border-[#1754cf]" : "text-[#636f88] hover:text-[#111318]"
                            )}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => setMode('register')}
                            className={cn(
                                "flex-1 pb-3 text-sm font-bold transition-all relative cursor-pointer",
                                mode === 'register' ? "text-[#1754cf] border-b-[3px] border-[#1754cf]" : "text-[#636f88] hover:text-[#111318]"
                            )}
                        >
                            Sign Up
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {mode === 'register' && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[#111318]">First Name</label>
                                    <input
                                        name="firstName"
                                        required
                                        placeholder="John"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        className="w-full bg-white border border-[#dcdfe5] rounded-lg py-3 px-4 text-[#111318] placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#1754cf] focus:border-[#1754cf] transition-all shadow-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[#111318]">Last Name</label>
                                    <input
                                        name="lastName"
                                        required
                                        placeholder="Doe"
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        className="w-full bg-white border border-[#dcdfe5] rounded-lg py-3 px-4 text-[#111318] placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#1754cf] focus:border-[#1754cf] transition-all shadow-sm"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[#111318]">Email address</label>
                            <input
                                name="email"
                                type="email"
                                required
                                placeholder="name@example.com"
                                value={formData.email}
                                onChange={handleInputChange}
                                className="w-full bg-white border border-[#dcdfe5] rounded-lg py-3 px-4 text-[#111318] placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#1754cf] focus:border-[#1754cf] transition-all shadow-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-[#111318]">Password</label>
                                {mode === 'login' && (
                                    <Link href="#" className="text-sm font-semibold text-[#1754cf] hover:underline cursor-pointer">Forgot password?</Link>
                                )}
                            </div>
                            <div className="relative">
                                <input
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className="w-full bg-white border border-[#dcdfe5] rounded-lg py-3 px-4 text-[#111318] placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#1754cf] focus:border-[#1754cf] transition-all shadow-sm pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#636f88] hover:text-[#111318] cursor-pointer"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>


                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 rounded-lg bg-[#1754cf] text-white hover:bg-[#1754cf]/90 font-bold transition-all shadow-lg shadow-[#1754cf]/20 cursor-pointer"
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin mx-auto" />
                            ) : (
                                mode === 'login' ? 'Sign In' : 'Create account'
                            )}
                        </Button>
                    </form>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-[#dcdfe5]"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="bg-white px-2 text-[#636f88]">Or continue with</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => handleSocial('google-oauth2')}
                            className="flex items-center justify-center gap-2 h-12 border border-[#dcdfe5] rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm text-[#111318] cursor-pointer"
                        >
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Google
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSocial('apple')}
                            className="flex items-center justify-center gap-2 h-12 border border-[#dcdfe5] rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm text-[#111318] cursor-pointer"
                        >
                            <svg className="h-5 w-5 fill-current" viewBox="0 0 384 512">
                                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 21.8-88.5 21.8-11.4 0-51.1-20.8-83.6-20.1-42.9.6-82.7 25-104.7 63.3-44.9 77.7-11.5 191.8 32 254.8 21.3 30.7 46.7 65 80.3 63.7 32-1.3 44-20.6 82.5-20.6 38.4 0 49.3 20.6 82.5 19.9 34.1-1.4 56.4-30.8 77.5-61.7 24.3-35.4 34.3-69.8 34.7-71.5-1-.4-66.7-25.6-67-101.9zm-41.2-184c15.8-19.2 26.5-45.8 23.6-72.5-23 .9-50.8 15.3-67.2 34.5-14.8 17.2-27.7 44.4-24.2 70.4 25.7 2 52-13.2 67.8-32.4z" />
                            </svg>
                            Apple
                        </button>
                    </div>

                    <p className="mt-10 text-center text-sm font-medium text-[#636f88]">
                        {mode === 'login' ? (
                            <>Don&apos;t have an account? <button onClick={() => setMode('register')} className="font-bold text-[#1754cf] hover:underline cursor-pointer">Create an account</button></>
                        ) : (
                            <>Already have an account? <button onClick={() => setMode('login')} className="font-bold text-[#1754cf] hover:underline cursor-pointer">Sign In</button></>
                        )}
                    </p>
                </div>
            </div>
        </div >
    );
}

export default function AuthPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center bg-[#f6f6f8]">
                    <Loader2 className="h-10 w-10 animate-spin text-[#1754cf]" aria-label="Loading" />
                </div>
            }
        >
            <AuthPageContent />
        </Suspense>
    );
}
