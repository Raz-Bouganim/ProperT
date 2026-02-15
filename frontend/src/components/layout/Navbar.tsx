'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { MessageCircle, Search, User as UserIcon, LogOut, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function Navbar() {
    const { isAuthenticated, user, logout } = useAuth();
    const pathname = usePathname();

    // Hide navbar on auth page
    if (pathname === '/auth') return null;

    return (
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 transition-all h-16">
            <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="bg-primary p-1.5 rounded-lg transition-transform group-hover:scale-105">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <span className="text-lg font-extrabold tracking-tight text-slate-900">ProperT</span>
                </Link>

                {/* Main Nav Links */}
                <div className="hidden md:flex items-center gap-6">
                    <Link href="/search" className="text-xs font-semibold text-slate-600 hover:text-primary transition-colors flex items-center gap-1.5">
                        <Search size={16} />
                        Search
                    </Link>
                    {isAuthenticated && (
                        <>
                            <Link href="/chat" className="text-xs font-semibold text-slate-600 hover:text-primary transition-colors flex items-center gap-1.5">
                                <MessageCircle size={16} />
                                Chats
                            </Link>
                        </>
                    )}
                </div>

                {/* Auth Actions */}
                <div className="flex items-center gap-3">
                    {isAuthenticated ? (
                        <div className="flex items-center gap-3">
                            <Link href="/dashboard" className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-xs font-medium text-slate-700">
                                <LayoutDashboard size={14} />
                                Dashboard
                            </Link>
                            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
                                <div className="flex flex-col items-end hidden lg:flex">
                                    <span className="text-xs font-bold text-slate-900 leading-none">{user?.firstName}</span>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => logout()} className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full w-8 h-8">
                                    <LogOut size={16} />
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link href="/auth?mode=login">
                                <Button variant="ghost" className="text-xs font-semibold px-3 py-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
                                    Sign In
                                </Button>
                            </Link>
                            <Link href="/auth?mode=register">
                                <Button className="bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all cursor-pointer">
                                    Get Started
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Bottom Bar - Simplified for new design */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-lg border-t flex items-center justify-around z-50 px-4">
                <Link href="/" className={cn("flex flex-col items-center gap-1", pathname === '/' ? "text-primary" : "text-slate-400")}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span className="text-[10px] font-bold">Home</span>
                </Link>
                <Link href="/search" className={cn("flex flex-col items-center gap-1", pathname === '/search' ? "text-primary" : "text-slate-400")}>
                    <Search size={20} />
                    <span className="text-[10px] font-bold">Search</span>
                </Link>
                {isAuthenticated ? (
                    <>
                        <Link href="/chat" className={cn("flex flex-col items-center gap-1", pathname === '/chat' ? "text-primary" : "text-slate-400")}>
                            <MessageCircle size={20} />
                            <span className="text-[10px] font-bold">Chat</span>
                        </Link>
                        <Link href="/dashboard" className={cn("flex flex-col items-center gap-1", pathname === '/dashboard' ? "text-primary" : "text-slate-400")}>
                            <LayoutDashboard size={20} />
                            <span className="text-[10px] font-bold">Menu</span>
                        </Link>
                    </>
                ) : (
                    <Link href="/auth?mode=login" className="flex flex-col items-center gap-1 text-slate-400">
                        <UserIcon size={20} />
                        <span className="text-[10px] font-bold">Log In</span>
                    </Link>
                )}
            </div>
        </nav>
    );
}
