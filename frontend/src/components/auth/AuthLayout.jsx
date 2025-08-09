import React from 'react';
import { Navigate, Outlet, Link } from 'react-router-dom'; // Добавили импорт Link
import { useAuth } from '../../context/AuthContext';

const AuthLayout = () => {
    const { isAuthenticated, loading } = useAuth();
    
    if (loading) {
        return <div className="text-center mt-5">Проверка авторизации...</div>;
    }
    
    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }
    
    return (
        <div className="container py-5">
            <div className="row justify-content-center">
                <div className="col-md-6 col-lg-4">
                    <div className="card shadow-sm">
                        <div className="card-body">
                            <Outlet />
                        </div>
                        <div className="card-footer text-center">
                            <Link to="/login" className="btn btn-link">Войти</Link>
                            <span className="mx-2">|</span>
                            <Link to="/register" className="btn btn-link">Регистрация</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;