'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';
import Cookies from 'js-cookie';

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
            const storedToken = Cookies.get('auth_token');
            if (storedToken) {
                try {
                    setToken(storedToken);
                    const { data } = await api.get('/users/me');
                    setUser(data);
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
                    Cookies.set('auth_token', data.access_token);
                } catch (error) {
                    console.error('Failed to refresh session:', error);
                    // If refresh fails (e.g., token already expired), logout
                    logout();
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
        Cookies.set('auth_token', newToken);
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        Cookies.remove('auth_token');
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
