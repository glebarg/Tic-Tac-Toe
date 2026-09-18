import { axiosInstance, API_URL } from './authService';

export const getProfileStats = () =>
    axiosInstance.get(`${API_URL}/profile/stats`);

export const getProfileGames = (page = 1, perPage = 20) =>
    axiosInstance.get(`${API_URL}/profile/games`, {
        params: {
            page,
            per_page: perPage
        }
    });