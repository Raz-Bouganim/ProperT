'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Home, Search, Heart, MessageCircle, PlusSquare, User as UserIcon, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LoginModal } from '@/components/auth/LoginModal';
import { useAuth } from '@/context/AuthContext';

export function Navbar() {
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const { isAuthenticated, user, logout } = useAuth();

    return (
        <>
            {/* Desktop Top Bar */}
            <header className="hidden md:flex h-16 items-center justify-between border-b px-6 sticky top-0 bg-background z-50">
                <Link href="/" className="text-xl font-bold text-primary">ProperT</Link>
                <nav className="flex items-center gap-6">
                    <Link href="/search" className="text-sm font-medium hover:text-primary">Search</Link>
                    <Link href="/saved" className="text-sm font-medium hover:text-primary">Saved</Link>
                    <Link href="/chat" className="text-sm font-medium hover:text-primary">Messages</Link>
                </nav>
                <div className="flex items-center gap-4">
                    {isAuthenticated ? (
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full">
                                <UserIcon size={16} />
                                <span className="text-sm font-medium">{user?.firstName}</span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={logout} title="Log out">
                                <LogOut size={18} />
                            </Button>
                        </div>
                    ) : (
                        <Button variant="ghost" onClick={() => setIsLoginOpen(true)}>Log in</Button>
                    )}
                    <Button>Post Ad</Button>
                </div>
            </header>

            {/* Mobile Bottom Bar */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t flex items-center justify-around z-50">
                <Link href="/" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary">
                    <Home size={20} />
                    <span className="text-[10px]">Home</span>
                </Link>
                <Link href="/search" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary">
                    <Search size={20} />
                    <span className="text-[10px]">Search</span>
                </Link>
                <Link href="/post" className="flex flex-col items-center gap-1 text-primary">
                    <PlusSquare size={24} />
                    <span className="text-[10px]">Post</span>
                </Link>
                <Link href="/saved" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary">
                    <Heart size={20} />
                    <span className="text-[10px]">Saved</span>
                </Link>
                <Link href="/chat" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary">
                    <MessageCircle size={20} />
                    <span className="text-[10px]">Chat</span>
                </Link>
                <button
                    onClick={() => !isAuthenticated && setIsLoginOpen(true)}
                    className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary"
                >
                    <UserIcon size={20} />
                    <span className="text-[10px]">{isAuthenticated ? user?.firstName : 'Profile'}</span>
                </button>
            </nav>

            <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
        </>
    );
}
