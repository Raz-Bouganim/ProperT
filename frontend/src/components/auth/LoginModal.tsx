'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { X, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type AuthMode = 'login' | 'register';

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
    const [mode, setMode] = useState<AuthMode>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { login: saveAuth } = useAuth();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
        const body = mode === 'login'
            ? { email: formData.email, password: formData.password }
            : formData;

        try {
            const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
            const { data } = await api.post(endpoint, body);

            saveAuth(data.access_token, data.user);
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Authentication failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            {/* Backdrop with extreme blur */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-[12px] animate-in fade-in duration-500"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-md bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">

                {/* Glow Effect */}
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/30 rounded-full blur-[80px]" />
                <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-[80px]" />

                <div className="relative p-8">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors rounded-full hover:bg-white/10"
                    >
                        <X size={20} />
                    </button>

                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-white mb-2">
                            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                        </h2>
                        <p className="text-white/60 text-sm">
                            {mode === 'login'
                                ? 'Access your listings and messages'
                                : 'Join the next generation of real estate'}
                        </p>
                    </div>

                    {/* Mode Switcher */}
                    <div className="flex p-1 bg-white/5 rounded-xl mb-8 border border-white/10">
                        <button
                            onClick={() => setMode('login')}
                            className={cn(
                                "flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-300",
                                mode === 'login' ? "bg-white text-black shadow-lg" : "text-white/60 hover:text-white"
                            )}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => setMode('register')}
                            className={cn(
                                "flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-300",
                                mode === 'register' ? "bg-white text-black shadow-lg" : "text-white/60 hover:text-white"
                            )}
                        >
                            Sign Up
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'register' && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-white/50 pl-1 uppercase tracking-wider">First Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                                        <input
                                            name="firstName"
                                            required
                                            placeholder="John"
                                            value={formData.firstName}
                                            onChange={handleInputChange}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-white/50 pl-1 uppercase tracking-wider">Last Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                                        <input
                                            name="lastName"
                                            required
                                            placeholder="Doe"
                                            value={formData.lastName}
                                            onChange={handleInputChange}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-white/50 pl-1 uppercase tracking-wider">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    placeholder="name@example.com"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-white/50 pl-1 uppercase tracking-wider">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-xs animate-in shake duration-300">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-12 rounded-xl bg-white text-black hover:bg-white/90 font-bold transition-all relative overflow-hidden group"
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin" />
                            ) : (
                                <span className="flex items-center gap-2">
                                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </span>
                            )}
                        </Button>
                    </form>

                    <p className="mt-8 text-center text-sm text-white/40">
                        {mode === 'login' ? (
                            <>
                                Forgot your password? <button className="text-white hover:underline transition-all">Reset it</button>
                            </>
                        ) : (
                            <>
                                By joining, you agree to our <button className="text-white hover:underline">Terms of Service</button>
                            </>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}
