'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import { toast } from 'sonner';

import { User } from '@/types/auth'; // updated path
import { AUTH_TOKEN_KEY } from '@/lib/constants';

// interface User removed

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: (showToast?: boolean) => void;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const logout = (showToast = true) => {
        setToken(null);
        setUser(null);
        Cookies.remove(AUTH_TOKEN_KEY);
        if (showToast) {
            toast.success('Logged out successfully');
        }
    };

    useEffect(() => {
        const checkAuth = async () => {
            const storedToken = Cookies.get(AUTH_TOKEN_KEY);
            if (storedToken) {
                try {
                    setToken(storedToken);
                    const { data } = await api.get('/users/me');
                    setUser(data);
                } catch (error) {
                    console.error('Session verification failed:', error);
                    logout(false);
                }
            } else {
                logout(false);
            }
            setIsLoading(false);
        };

        checkAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Rolling session: refresh logic
    useEffect(() => {
        if (!token) return;

        let lastActivity = Date.now();
        const handleActivity = () => {
            lastActivity = Date.now();
        };

        window.addEventListener('mousedown', handleActivity);
        window.addEventListener('keydown', handleActivity);

        // Refresh token every 10 minutes if there was activity
        const refreshInterval = setInterval(async () => {
            const now = Date.now();
            if (now - lastActivity < 10 * 60 * 1000) { // If active in last 10m
                try {
                    const { data } = await api.post('/auth/refresh');
                    setToken(data.access_token);
                    Cookies.set(AUTH_TOKEN_KEY, data.access_token);
                } catch (error) {
                    console.error('Failed to refresh session:', error);
                    // If refresh fails (e.g., token already expired), logout
                    logout(false);
                }
            }
        }, 10 * 60 * 1000); // Check every 10 minutes

        return () => {
            window.removeEventListener('mousedown', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            clearInterval(refreshInterval);
        };
    }, [token]);

    const login = (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        Cookies.set(AUTH_TOKEN_KEY, newToken);
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
