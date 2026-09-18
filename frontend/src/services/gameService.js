import { axiosInstance, API_URL } from './authService';

export const createGame = (boardSize, winCondition, gameType) => {
    return axiosInstance.post(`${API_URL}/games`, {
        board_size: boardSize,
        win_condition: winCondition,
        game_type: gameType
    });
};

export const getGames = () => {
    return axiosInstance.get(`${API_URL}/games`);
};

export const getGame = (gameId) => {
    return axiosInstance.get(`${API_URL}/games/${gameId}`);
};

export const joinGame = (gameId) => {
    return axiosInstance.post(`${API_URL}/games/${gameId}/join`);
};

export const getGameState = (gameId) => {
    return axiosInstance.get(`${API_URL}/games/${gameId}/state`);
};

export const makeMove = (gameId, row, col, symbol) => {
    return axiosInstance.post(`${API_URL}/games/${gameId}/move`, {
        row,
        col,
        symbol
    });
};
