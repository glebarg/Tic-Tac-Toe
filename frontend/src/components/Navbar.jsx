import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path) => {
        return location.pathname === path;
    };

    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
            <div className="container">

                <Link
                    className="navbar-brand fw-bold"
                    to="/"
                >
                    🎮 Tic-Tac-Toe
                </Link>

                <button
                    className="navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarNav"
                    aria-controls="navbarNav"
                    aria-expanded="false"
                    aria-label="Переключить навигацию"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>

                <div
                    className="collapse navbar-collapse"
                    id="navbarNav"
                >

                    <ul className="navbar-nav me-auto">

                        <li className="nav-item">
                            <Link
                                className={`nav-link ${
                                    isActive('/') ? 'active' : ''
                                }`}
                                to="/"
                            >
                                📰 Новости
                            </Link>
                        </li>

                        <li className="nav-item">
                            <Link
                                className={`nav-link ${
                                    isActive('/lobby') ? 'active' : ''
                                }`}
                                to="/lobby"
                            >
                                🎮 Играть
                            </Link>
                        </li>

                        <li className="nav-item">
                            <Link
                                className={`nav-link ${
                                    isActive('/ranked') ? 'active' : ''
                                }`}
                                to="/ranked"
                            >
                                🏆 Рейтинг
                            </Link>
                        </li>
                        {user?.role === 'admin' && (
                        <li className="nav-item">
                            <Link 
                            className={`nav-link ${
                                location.pathname.startsWith('/admin')? 'active': ''
                            }`}
                            to="/admin/news"
                            >
                                🛠 Админка
                            </Link>
                        </li>
                        )}
                        <li className="nav-item">
                            <Link className={`nav-link ${
                                location.pathname === '/news/my'? 'active': ''
                            }`}
                            to="/news/my"
                            >📝 Мои новости
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link
                                to="/shop"
                                className="nav-link"
                                >
                                🛒 Магазин
                            </Link>
                        </li>

                    </ul>

                    <ul className="navbar-nav ms-auto align-items-lg-center">

                        <li className="nav-item">
                            <Link
                                className={`nav-link ${
                                    isActive('/profile') ? 'active' : ''
                                }`}
                                to="/profile"
                            >
                                👤 {user?.username}
                            </Link>
                        </li>

                        <li className="nav-item ms-lg-2 mt-2 mt-lg-0">
                            <button
                                className="btn btn-outline-light"
                                onClick={handleLogout}
                            >
                                Выйти
                            </button>
                        </li>

                    </ul>

                </div>

            </div>
        </nav>
    );
};

export default Navbar;