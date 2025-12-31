import api from './api';

interface LoginResponse {
    access_token: string;
    token_type: string;
    user: {
        id: string;
        email: string;
        full_name: string | null;
        role: string;
    };
}

interface RegisterResponse {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
}

interface UserData {
    email: string;
    password: string;
    full_name?: string;
}

const TOKEN_KEY = 'wildfire_access_token';
const USER_KEY = 'wildfire_user';

export const authService = {
    async login(email: string, password: string): Promise<LoginResponse> {
        const response = await api.post<LoginResponse>('/api/auth/login', { email, password });
        const data = response.data;

        // Store token and user in localStorage
        localStorage.setItem(TOKEN_KEY, data.access_token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));

        return data;
    },

    async register(userData: UserData): Promise<RegisterResponse> {
        const response = await api.post<RegisterResponse>('/api/auth/register', userData);
        return response.data;
    },

    logout(): void {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    },

    getToken(): string | null {
        return localStorage.getItem(TOKEN_KEY);
    },

    getUser(): LoginResponse['user'] | null {
        const userStr = localStorage.getItem(USER_KEY);
        if (!userStr) return null;
        try {
            return JSON.parse(userStr);
        } catch {
            return null;
        }
    },

    isAuthenticated(): boolean {
        return !!this.getToken();
    }
};

export default authService;
