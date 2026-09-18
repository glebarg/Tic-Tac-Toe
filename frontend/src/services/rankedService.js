import { axiosInstance, API_URL } from './authService';


export const getRankings = () => {
    return axiosInstance.get(`${API_URL}/ranked/ratings`);
};


export const getRanking = (boardSize) => {
    return axiosInstance.get(
        `${API_URL}/ranked/rating/${boardSize}`
    );
};

export const joinRankedQueue = (boardSize) => {
    return axiosInstance.post(
        `${API_URL}/ranked/queue/${boardSize}`
    );
};


export const leaveRankedQueue = (boardSize) => {
    return axiosInstance.delete(
        `${API_URL}/ranked/queue/${boardSize}`
    );
};


export const getRankedHistory = () => {
    return axiosInstance.get(
        `${API_URL}/ranked/history`
    );
};
export const getRankedMatch = (gameId) =>
    axiosInstance.get(`${API_URL}/ranked/match/${gameId}`);