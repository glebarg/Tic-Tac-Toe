import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getProfileStats } from '../../services/profileService';

const ProfilePage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await getProfileStats();

            setStats(response.data);
        } catch (err) {
            console.error(
                'Ошибка загрузки статистики:',
                err
            );

            const detail = err.response?.data?.detail;

            if (typeof detail === 'string') {
                setError(detail);
            } else {
                setError(
                    'Не удалось загрузить статистику'
                );
            }
        } finally {
            setLoading(false);
        }
    };

    const registrationDate = user?.created_at
        ? new Date(
            user.created_at
        ).toLocaleDateString('ru-RU')
        : '—';

    return (
        <div className="container mt-4">

 
            <div className="d-flex justify-content-between align-items-center mb-4">

                <div>
                    <h1>👤 Личный кабинет</h1>

                    <p className="text-muted mb-0">
                        Профиль и игровая статистика
                    </p>
                </div>

                <button
                    className="btn btn-secondary"
                    onClick={() => navigate('/')}
                >
                    ← Новости
                </button>

            </div>

            {error && (
                <div className="alert alert-danger">
                    {error}
                </div>
            )}

            <div className="row">

   
                <div className="col-lg-4 mb-4">

                    <div className="card shadow-sm h-100">

                        <div className="card-body text-center p-4">

                            <div
                                className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto mb-3"
                                style={{
                                    width: '100px',
                                    height: '100px',
                                    fontSize: '2.5rem'
                                }}
                            >
                                👤
                            </div>

                            <h3>
                                {user?.username}
                            </h3>

                            <p className="text-muted mb-1">
                                {user?.email}
                            </p>

                            <small className="text-muted">
                                Зарегистрирован:{' '}
                                {registrationDate}
                            </small>

                            <hr />

                            <button
                                className="btn btn-outline-primary w-100 mb-2"
                                disabled
                            >
                                ⚙️ Настройки профиля
                            </button>

                            <small className="text-muted d-block">
                                Настройки будут доступны позже
                            </small>

                        </div>

                    </div>

                </div>


                <div className="col-lg-8">

                    <div className="card shadow-sm mb-4">

                        <div className="card-header">
                            <h4 className="mb-0">
                                📊 Общая статистика
                            </h4>
                        </div>

                        <div className="card-body">

                            {loading ? (

                                <div className="text-center py-4">
                                    <div
                                        className="spinner-border"
                                        role="status"
                                    />
                                </div>

                            ) : stats ? (

                                <>
                                    <div className="row text-center">

                                        <div className="col-md-3 mb-3 mb-md-0">

                                            <div className="fs-3 fw-bold">
                                                {stats.total_games}
                                            </div>

                                            <small className="text-muted">
                                                Игр сыграно
                                            </small>

                                        </div>

                                        <div className="col-md-3 mb-3 mb-md-0">

                                            <div className="fs-3 fw-bold text-success">
                                                {stats.wins}
                                            </div>

                                            <small className="text-muted">
                                                Побед
                                            </small>

                                        </div>

                                        <div className="col-md-3 mb-3 mb-md-0">

                                            <div className="fs-3 fw-bold text-danger">
                                                {stats.losses}
                                            </div>

                                            <small className="text-muted">
                                                Поражений
                                            </small>

                                        </div>

                                        <div className="col-md-3">

                                            <div className="fs-3 fw-bold text-warning">
                                                {stats.draws}
                                            </div>

                                            <small className="text-muted">
                                                Ничьих
                                            </small>

                                        </div>

                                    </div>

                                    <hr />

                                    <div className="text-center">

                                        <div className="fs-4 fw-bold">
                                            {stats.win_rate}%
                                        </div>

                                        <small className="text-muted">
                                            Процент побед
                                        </small>

                                    </div>

                                </>

                            ) : (

                                <div className="text-center text-muted">
                                    Нет данных
                                </div>

                            )}

                        </div>

                    </div>


                    <div className="card shadow-sm mb-4">

                        <div className="card-header d-flex justify-content-between align-items-center">

                            <h4 className="mb-0">
                                🏆 Ranked
                            </h4>

                            <button
                                className="btn btn-sm btn-warning"
                                onClick={() => navigate('/ranked')}
                            >
                                Открыть рейтинг
                            </button>

                        </div>

                        <div className="card-body">

                            {loading ? (

                                <div className="text-center py-3">
                                    <div
                                        className="spinner-border"
                                        role="status"
                                    />
                                </div>

                            ) : stats?.ratings?.length ? (

                                <div className="table-responsive">

                                    <table className="table table-hover align-middle mb-0">

                                        <thead>

                                            <tr>
                                                <th>Поле</th>
                                                <th>Рейтинг</th>
                                                <th>Игр</th>
                                                <th>Побед</th>
                                                <th>Поражений</th>
                                                <th>Ничьих</th>
                                            </tr>

                                        </thead>

                                        <tbody>

                                            {stats.ratings.map(
                                                (rating) => (
                                                    <tr
                                                        key={
                                                            rating.board_size
                                                        }
                                                    >

                                                        <td>
                                                            <strong>
                                                                {rating.board_size}
                                                                ×
                                                                {rating.board_size}
                                                            </strong>
                                                        </td>

                                                        <td>

                                                            <span className="badge bg-warning text-dark fs-6">
                                                                {rating.rating}
                                                            </span>

                                                        </td>

                                                        <td>
                                                            {rating.games_played}
                                                        </td>

                                                        <td className="text-success">
                                                            {rating.wins}
                                                        </td>

                                                        <td className="text-danger">
                                                            {rating.losses}
                                                        </td>

                                                        <td className="text-warning">
                                                            {rating.draws}
                                                        </td>

                                                    </tr>
                                                )
                                            )}

                                        </tbody>

                                    </table>

                                </div>

                            ) : (

                                <p className="text-muted mb-0">
                                    Рейтинговых игр пока нет.
                                </p>

                            )}

                        </div>

                    </div>

                    {!loading && stats && (

                        <div className="card shadow-sm mb-4">

                            <div className="card-header">
                                <h4 className="mb-0">
                                    📈 Ranked статистика
                                </h4>
                            </div>

                            <div className="card-body">

                                <div className="row text-center">

                                    <div className="col-md-3">

                                        <div className="fs-4 fw-bold">
                                            {stats.ranked_games}
                                        </div>

                                        <small className="text-muted">
                                            Игр
                                        </small>

                                    </div>

                                    <div className="col-md-3">

                                        <div className="fs-4 fw-bold text-success">
                                            {stats.ranked_wins}
                                        </div>

                                        <small className="text-muted">
                                            Побед
                                        </small>

                                    </div>

                                    <div className="col-md-3">

                                        <div className="fs-4 fw-bold text-danger">
                                            {stats.ranked_losses}
                                        </div>

                                        <small className="text-muted">
                                            Поражений
                                        </small>

                                    </div>

                                    <div className="col-md-3">

                                        <div className="fs-4 fw-bold text-warning">
                                            {stats.ranked_draws}
                                        </div>

                                        <small className="text-muted">
                                            Ничьих
                                        </small>

                                    </div>

                                </div>

                            </div>

                        </div>

                    )}


                    <div className="card shadow-sm">

                        <div className="card-header">

                            <h4 className="mb-0">
                                🎮 История игр
                            </h4>

                        </div>

                        <button className="btn btn-primary" onClick={() => navigate("/profile/games")} >
                            🎮 Открыть историю игр
                        </button>

                    </div>

                </div>

            </div>

        </div>
    );
};

export default ProfilePage;