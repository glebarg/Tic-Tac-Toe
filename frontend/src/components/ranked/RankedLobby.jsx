import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getRankings,
    joinRankedQueue
} from '../../services/rankedService';

const BOARD_SIZES = [3, 4, 5, 6, 7, 8, 9, 10];

const RankedLobby = () => {
    const navigate = useNavigate();

    const [ratings, setRatings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [joiningSize, setJoiningSize] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        loadRatings();
    }, []);

    const loadRatings = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await getRankings();

            setRatings(response.data);

        } catch (error) {
            console.error(
                'Ошибка загрузки рейтингов:',
                error
            );

            setError(
                error.response?.data?.detail ||
                'Не удалось загрузить рейтинги'
            );

        } finally {
            setLoading(false);
        }
    };

    const getRatingForSize = (size) => {
        return ratings.find(
            rating => rating.board_size === size
        );
    };

    const handlePlay = async (boardSize) => {
        try {
            setError('');
            setJoiningSize(boardSize);

            const response = await joinRankedQueue(
                boardSize
            );

            console.log(
                '[RANKED] Queue response:',
                response.data
            );

           
            if (
                response.data.status === 'matched' &&
                response.data.game_id
            ) {
                navigate(
                    `/game/${response.data.game_id}`
                );

                return;
            }

            
            navigate(
                `/ranked/queue/${boardSize}`
            );

        } catch (error) {
            console.error(
                'Ошибка входа в рейтинговую очередь:',
                error
            );

            setError(
                error.response?.data?.detail ||
                'Не удалось начать поиск соперника'
            );

            setJoiningSize(null);
        }
    };

    if (loading) {
        return (
            <div className="container mt-4">
                <div className="text-center">
                    Загрузка рейтингов...
                </div>
            </div>
        );
    }

    return (
        <div className="container mt-4">

            <div className="d-flex justify-content-between align-items-center mb-4">

    <div>
        <h2>🏆 Рейтинговые игры</h2>

        <p className="text-muted mb-0">
            Выберите размер поля и найдите
            соперника своего уровня
        </p>
    </div>

    <div className="d-flex gap-2">

        <button
    className="btn btn-warning"
    onClick={() => navigate('/ranked/leaderboard')}
>
    🏆 Таблица лидеров
</button>

        <button
            className="btn btn-secondary"
            onClick={() => navigate('/')}
        >
            Назад
        </button>

    </div>

</div>

            {error && (
                <div className="alert alert-danger">
                    {error}
                </div>
            )}

            <div className="row">

                {BOARD_SIZES.map(boardSize => {

                    const rating =
                        getRatingForSize(boardSize);

                    const currentRating =
                        rating?.rating ?? 1000;

                    const wins =
                        rating?.wins ?? 0;

                    const losses =
                        rating?.losses ?? 0;

                    const draws =
                        rating?.draws ?? 0;

                    const gamesPlayed =
                        rating?.games_played ?? 0;

                    return (
                        <div
                            className="col-md-6 col-lg-4 mb-4"
                            key={boardSize}
                        >

                            <div className="card h-100 shadow-sm">

                                <div className="card-body">

                                    <div className="d-flex justify-content-between align-items-center">

                                        <h4 className="card-title mb-0">
                                            {boardSize} × {boardSize}
                                        </h4>

                                        <span className="badge bg-warning text-dark fs-6">
                                            ⭐ {currentRating}
                                        </span>

                                    </div>

                                    <hr />

                                    <div className="row text-center mb-3">

                                        <div className="col">
                                            <div className="text-success fw-bold">
                                                {wins}
                                            </div>

                                            <small className="text-muted">
                                                Побед
                                            </small>
                                        </div>

                                        <div className="col">
                                            <div className="text-danger fw-bold">
                                                {losses}
                                            </div>

                                            <small className="text-muted">
                                                Поражений
                                            </small>
                                        </div>

                                        <div className="col">
                                            <div className="text-warning fw-bold">
                                                {draws}
                                            </div>

                                            <small className="text-muted">
                                                Ничьих
                                            </small>
                                        </div>

                                    </div>

                                    <div className="text-muted text-center mb-3">
                                        Сыграно игр: {gamesPlayed}
                                    </div>

                                    <button
                                        className="btn btn-primary w-100"
                                        onClick={() =>
                                            handlePlay(boardSize)
                                        }
                                        disabled={
                                            joiningSize !== null
                                        }
                                    >
                                        {joiningSize === boardSize
                                            ? 'Подключение...'
                                            : 'Играть'}
                                    </button>

                                </div>

                            </div>

                        </div>
                    );
                })}

            </div>

        </div>
    );
};

export default RankedLobby;