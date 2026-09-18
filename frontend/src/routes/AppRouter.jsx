import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';
import AuthLayout from '../components/auth/AuthLayout';
import Lobby from '../components/game/Lobby';
import GameBoard from '../components/game/GameBoard';
import RankedLobby from '../components/ranked/RankedLobby';
import RankedQueue from '../components/ranked/RankedQueue';
import NewsPage from '../components/news/NewsPage';
import ProfilePage from '../components/profile/ProfilePage';
import NewsDetailPage from '../components/news/NewsDetailPage';
import NewsCreatePage from '../components/news/NewsCreatePage';
import MyNewsPage from '../components/news/MyNewsPage';
import AdminNewsPage from '../components/admin/AdminNewsPage';
import GameHistory from '../components/profile/GameHistory';
import LeaderboardPage from '../components/ranked/LeaderboardPage';
import ShopPage from '../components/shop/ShopPage';
const AppRouter = () => (
    <Routes>

        <Route element={<PrivateRoute />}>
            
            <Route path="/" element={<NewsPage />}/>
            <Route path="/news/:id" element={<NewsDetailPage />} />
            <Route path="/news/create" element={<NewsCreatePage />}/>
            <Route path="/news/my" element={<MyNewsPage />}/>
            <Route path="/admin/news" element={<AdminNewsPage />}/>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/games" element={<GameHistory />}/>
            <Route path="/ranked" element={<RankedLobby />}/>
            <Route path="/shop" element={<ShopPage />}/>
            <Route path="/lobby" element={<Lobby />}/>
            <Route path="/game/:id" element={<GameBoard />}/>
            <Route path="/ranked/leaderboard" element={<LeaderboardPage />}/>
            <Route path="/ranked/queue/:boardSize" element={<RankedQueue />}/>

        </Route>

        <Route element={<AuthLayout />}>

            <Route path="/login" element={<LoginForm />}/>
            <Route path="/register" element={<RegisterForm />}/>

        </Route>

        <Route path="*" element={<Navigate to="/" replace />}/>

    </Routes>
);

export default AppRouter;