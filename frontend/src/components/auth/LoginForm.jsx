import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, getUserData } from '../../services/authService'; // Добавили импорт getUserData
import { useAuth } from '../../context/AuthContext';

const LoginForm = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const { login: authLogin } = useAuth();
    const navigate = useNavigate();

   const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
        
        const response = await login(formData.email, formData.password);
        localStorage.setItem('access_token', response.data.access_token);
        localStorage.setItem('refresh_token', response.data.refresh_token);
        const userData = await getUserData();
        authLogin(response.data, userData);
        
        navigate('/');
    } catch (err) {
        setError(err.response?.data?.detail || 'Произошла ошибка');
    }
};

    return (
        <>
            <h2 className="text-center mb-4">Вход в систему</h2>
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label htmlFor="email" className="form-label">Email</label>
                    <input
                        type="email"
                        className="form-control"
                        id="email"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        required
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="password" className="form-label">Пароль</label>
                    <input
                        type="password"
                        className="form-control"
                        id="password"
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        required
                    />
                </div>
                <button type="submit" className="btn btn-primary w-100">Войти</button>
            </form>
            <div className="mt-3 text-center">
                <Link to="/register">Создать новый аккаунт</Link>
            </div>
        </>
    );
};

export default LoginForm;