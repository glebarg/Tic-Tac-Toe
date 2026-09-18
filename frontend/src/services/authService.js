import axios from 'axios';

export const API_URL = "http://localhost:8000";


export const axiosInstance = axios.create();


export const getValidAccessToken = async () => {
  let accessToken = localStorage.getItem('access_token');
  const refreshToken = localStorage.getItem('refresh_token');

  if (!accessToken) {
    return null;
  }


  try {
    const payload = JSON.parse(
      atob(
        accessToken
          .split('.')[1]
          .replace(/-/g, '+')
          .replace(/_/g, '/')
      )
    );

    const currentTime = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp > currentTime) {
      return accessToken;
    }

    console.log(
      '[AUTH] Access token expired, refreshing...'
    );

  } catch (error) {
    console.error(
      '[AUTH] Failed to decode access token:',
      error
    );
  }

 
  if (!refreshToken) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');

    return null;
  }

  try {
    const response = await axios.post(
      `${API_URL}/refresh`,
      {
        refresh_token: refreshToken
      }
    );

    const newAccessToken =
      response.data.access_token;

    const newRefreshToken =
      response.data.refresh_token;

    localStorage.setItem(
      'access_token',
      newAccessToken
    );

    localStorage.setItem(
      'refresh_token',
      newRefreshToken
    );

    console.log(
      '[AUTH] Access token successfully refreshed'
    );

    return newAccessToken;

  } catch (error) {
    console.error(
      '[AUTH] Refresh token error:',
      error
    );

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');

    window.location = '/login';

    return null;
  }
};


axiosInstance.interceptors.request.use(
  config => {
    const token =
      localStorage.getItem('access_token');

    if (token) {
      config.headers = config.headers || {};

      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },

  error => Promise.reject(error)
);


axiosInstance.interceptors.response.use(
  response => response,

  async error => {
    const originalRequest =
      error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken =
          localStorage.getItem('refresh_token');

        const response =
          await axios.post(
            `${API_URL}/refresh`,
            {
              refresh_token: refreshToken
            }
          );

        localStorage.setItem(
          'access_token',
          response.data.access_token
        );

        localStorage.setItem(
          'refresh_token',
          response.data.refresh_token
        );

        originalRequest.headers =
          originalRequest.headers || {};

        originalRequest.headers.Authorization =
          `Bearer ${response.data.access_token}`;

        return axiosInstance(
          originalRequest
        );

      } catch (refreshError) {

        console.error(
          "Ошибка обновления токена:",
          refreshError
        );

        localStorage.removeItem(
          'access_token'
        );

        localStorage.removeItem(
          'refresh_token'
        );

        window.location = '/login';

        return Promise.reject(
          refreshError
        );
      }
    }

    return Promise.reject(error);
  }
);


export const register = (
  username,
  email,
  password
) => {
  return axiosInstance.post(
    `${API_URL}/register`,
    {
      username,
      email,
      password
    }
  );
};


export const login = (
  email,
  password
) => {
  return axiosInstance.post(
    `${API_URL}/login`,
    {
      email,
      password
    }
  );
};


export const getUserData = async () => {
  const response =
    await axiosInstance.get(
      `${API_URL}/me`
    );

  return response.data;
};


export const logout = () => {
  localStorage.removeItem(
    'access_token'
  );

  localStorage.removeItem(
    'refresh_token'
  );
};
