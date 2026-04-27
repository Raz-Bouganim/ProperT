import axios from 'axios';
import Cookies from 'js-cookie';
import { AUTH_TOKEN_KEY } from './constants';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const token = Cookies.get(AUTH_TOKEN_KEY);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            Cookies.remove(AUTH_TOKEN_KEY);
            if (typeof window !== 'undefined' && window.location.pathname !== '/auth') {
                window.location.href = '/auth'; // Redirect to auth page on 401
            }
        }
        return Promise.reject(error);
    }
);

export default api;
