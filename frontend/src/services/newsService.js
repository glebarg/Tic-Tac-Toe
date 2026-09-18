import { axiosInstance, API_URL } from './authService';

export const getNews = () =>
    axiosInstance.get(`${API_URL}/news`);

export const getNewsById = (newsId) =>
    axiosInstance.get(`${API_URL}/news/${newsId}`);

export const createNews = (data) =>
    axiosInstance.post(`${API_URL}/news`, data);

export const getMyNews = () =>
    axiosInstance.get(`${API_URL}/news/my`);

export const getAdminNews = () =>
    axiosInstance.get(`${API_URL}/admin/news`);

export const getPendingNews = () =>
    axiosInstance.get(`${API_URL}/admin/news/pending`);

export const publishNews = (newsId) =>
    axiosInstance.post(`${API_URL}/admin/news/${newsId}/publish`);

export const rejectNews = (newsId, reason = '') =>
    axiosInstance.post(
        `${API_URL}/admin/news/${newsId}/reject`,
        { reason }
    );

export const updateNews = (newsId, data) =>
    axiosInstance.put(
        `${API_URL}/admin/news/${newsId}`,
        data
    );

export const deleteNews = (newsId) =>
    axiosInstance.delete(
        `${API_URL}/admin/news/${newsId}`
    );