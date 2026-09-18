import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:8000';

const BOARD_SIZES = [3, 4, 5, 6, 7, 8, 9, 10];

const LeaderboardPage = () => {
    const navigate = useNavigate();

    const [boardSize, setBoardSize] = useState(3);
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadLeaderboard = async (size) => {
        try {
            setLoading(true);
            setError('');

            const token = localStorage.getItem('access_token');

            const response = await fetch(
                `${API_URL}/ranked/leaderboard/${size}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.detail ||
                    'Не удалось загрузить рейтинг'
                );
            }
            if (Array.isArray(data)) {
                setPlayers(data);
            } else {
                setPlayers(data.players || []);
            }

        } catch (err) {
            console.error(
                'Ошибка загрузки рейтинга:',
                err
            );

            setError(
                err.message ||
                'Ошибка загрузки рейтинга'
            );

            setPlayers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLeaderboard(boardSize);
    }, [boardSize]);

    return (
        <div className="container mt-4">

            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>🏆 Рейтинг игроков</h2>

                <button
                    className="btn btn-secondary"
                    onClick={() => navigate('/ranked')}
                >
                    ← Назад
                </button>
            </div>

           
            <div className="card shadow-sm mb-4">
                <div className="card-body">

                    <div className="btn-group flex-wrap">

                        {BOARD_SIZES.map((size) => (
                            <button
                                key={size}
                                className={
                                    `btn ${
                                        boardSize === size
                                            ? 'btn-primary'
                                            : 'btn-outline-primary'
                                    }`
                                }
                                onClick={() => setBoardSize(size)}
                            >
                                {size} × {size}
                            </button>
                        ))}

                    </div>

                </div>
            </div>

            {error && (
                <div className="alert alert-danger">
                    {error}
                </div>
            )}

          
            <div className="card shadow-sm">

                <div className="card-header">
                    <h5 className="mb-0">
                        🏆 Рейтинг {boardSize} × {boardSize}
                    </h5>
                </div>

                <div className="card-body p-0">

                    {loading ? (

                        <div className="text-center p-5">
                            Загрузка...
                        </div>

                    ) : players.length === 0 ? (

                        <div className="text-center p-5 text-muted">
                            Пока никто не сыграл рейтинговую игру
                        </div>

                    ) : (

                        <div className="table-responsive">

                            <table className="table table-hover mb-0">

                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Игрок</th>
                                        <th>⭐ Рейтинг</th>
                                        <th>🏆 Победы</th>
                                        <th>❌ Поражения</th>
                                        <th>🤝 Ничьи</th>
                                        <th>🎮 Игр</th>
                                    </tr>
                                </thead>

                                <tbody>

                                    {players.map((player, index) => {

                                        const position = index + 1;

                                        return (
                                            <tr key={player.user_id}>

                                                <td>
                                                    {position === 1
                                                        ? '🥇'
                                                        : position === 2
                                                            ? '🥈'
                                                            : position === 3
                                                                ? '🥉'
                                                                : position
                                                    }
                                                </td>

                                                <td className="fw-bold">
                                                    {player.username}
                                                </td>

                                                <td>
                                                    ⭐ {player.rating}
                                                </td>

                                                <td className="text-success">
                                                    {player.wins}
                                                </td>

                                                <td className="text-danger">
                                                    {player.losses}
                                                </td>

                                                <td>
                                                    {player.draws}
                                                </td>

                                                <td>
                                                    {player.games_played}
                                                </td>

                                            </tr>
                                        );
                                    })}

                                </tbody>

                            </table>

                        </div>
                    )}

                </div>

            </div>

        </div>
    );
};

export default LeaderboardPage;