import axios from 'axios';

const API_URL = "http://localhost:8000";
const axiosInstance = axios.create();

axiosInstance.interceptors.request.use(config => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

axiosInstance.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
                const refreshToken = localStorage.getItem('refresh_token');
                const response = await axios.post(`${API_URL}/refresh`, { refresh_token: refreshToken });
                
                localStorage.setItem('access_token', response.data.access_token);
                localStorage.setItem('refresh_token', response.data.refresh_token);
                
                originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;
                return axiosInstance(originalRequest);
            } catch (refreshError) {
                console.error("Ошибка обновления токена:", refreshError);
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location = '/login';
            }
        }
        
        return Promise.reject(error);
    }
);

export const register = (username, email, password) => {
    return axiosInstance.post(`${API_URL}/register`, {
        username,
        email,
        password
    });
};

export const login = (email, password) => {
    return axiosInstance.post(`${API_URL}/login`, {
        email,
        password
    });
};

export const getUserData = async () => {
    const response = await axiosInstance.get(`${API_URL}/me`);
    return response.data;
};

export const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
};