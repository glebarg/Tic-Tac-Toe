import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register, getUserData } from '../../services/authService'; // Добавили импорт getUserData
import { useAuth } from '../../context/AuthContext';

const RegisterForm = () => {
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });
    const [error, setError] = useState('');
    const { login: authLogin } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
        
        const response = await register(formData.username, formData.email, formData.password);
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
            <h2 className="text-center mb-4">Регистрация</h2>
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label htmlFor="username" className="form-label">Никнейм</label>
                    <input
                        type="text"
                        className="form-control"
                        id="username"
                        value={formData.username}
                        onChange={e => setFormData({...formData, username: e.target.value})}
                        required
                    />
                </div>
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
                <button type="submit" className="btn btn-primary w-100">Зарегистрироваться</button>
            </form>
            <div className="mt-3 text-center">
                <Link to="/login">Уже есть аккаунт? Войти</Link>
            </div>
        </>
    );
};

export default RegisterForm;