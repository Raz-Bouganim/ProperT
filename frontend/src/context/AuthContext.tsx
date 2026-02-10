'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'SEEKER' | 'OWNER';
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const storedToken = localStorage.getItem('auth_token');
            if (storedToken) {
                try {
                    // Optimistically set token to allow api interceptor to work if it relied on context (though it relies on LS)
                    setToken(storedToken);

                    const { data } = await api.get('/users/me');
                    setUser(data);
                    localStorage.setItem('auth_user', JSON.stringify(data));
                } catch (error) {
                    console.error('Session verification failed:', error);
                    logout();
                }
            } else {
                logout();
            }
            setIsLoading(false);
        };

        checkAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const login = (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('auth_token', newToken);
        localStorage.setItem('auth_user', JSON.stringify(newUser));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
