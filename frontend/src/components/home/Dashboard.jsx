import React from 'react';
import { useAuth } from '../../context/AuthContext';

const Dashboard = () => {
    const { user } = useAuth();

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-8">
                    <div className="card">
                        <div className="card-header bg-primary text-white">
                            <h2>Личный кабинет</h2>
                        </div>
                        <div className="card-body">
                            <div className="alert alert-success">
                                <h4>Добро пожаловать, {user?.username}!</h4>
                                <p>Вы успешно авторизовались в системе</p>
                                <p>Ваш email: {user?.email}</p>
                                <p>Дата регистрации: {new Date(user?.created_at).toLocaleDateString()}</p>
                            </div>
                            <div className="mt-4">
                                <h4>Дополнительная информация</h4>
                                <p>Здесь может быть ваша персональная информация, настройки аккаунта или другие функции приложения.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;