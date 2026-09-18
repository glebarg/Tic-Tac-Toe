import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProfileGames } from "../../services/profileService";

import "./GameHistory.css";

function GameHistory() {
    const navigate = useNavigate();

    const [games, setGames] = useState([]);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(0);
    const [total, setTotal] = useState(0);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const perPage = 20;

    const loadGames = async (currentPage) => {
        try {
            setLoading(true);
            setError("");

            const response = await getProfileGames(
                currentPage,
                perPage
            );

            const data = response.data;

            setGames(data.items || []);
            setPage(data.page || currentPage);
            setPages(data.pages || 0);
            setTotal(data.total || 0);

        } catch (err) {
            console.error(
                "Ошибка загрузки истории игр:",
                err
            );

            setError(
                err?.response?.data?.detail ||
                "Не удалось загрузить историю игр"
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadGames(page);
    }, [page]);

    const getResultIcon = (result) => {
        if (result === "win") {
            return "🏆";
        }

        if (result === "loss") {
            return "❌";
        }

        return "🤝";
    };

    const getResultText = (result) => {
        if (result === "win") {
            return "Победа";
        }

        if (result === "loss") {
            return "Поражение";
        }

        return "Ничья";
    };

    const getGameTypeText = (gameType) => {
        if (gameType === "ranked") {
            return "Ranked";
        }

        if (gameType === "computer") {
            return "Компьютер";
        }

        return "Обычная";
    };

    const formatDate = (date) => {
        if (!date) {
            return "—";
        }

        return new Date(date).toLocaleString(
            "ru-RU",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        );
    };

    const getRatingClass = (change) => {
        if (change === null || change === undefined) {
            return "";
        }

        if (change > 0) {
            return "rating-positive";
        }

        if (change < 0) {
            return "rating-negative";
        }

        return "rating-neutral";
    };

    const handleOpenGame = (gameId) => {
        navigate(`/game/${gameId}`);
    };

    if (loading) {
        return (
            <div className="game-history">
                <div className="game-history-header">
                    <h1>История игр</h1>
                </div>

                <div className="game-history-loading">
                    Загрузка...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="game-history">
                <div className="game-history-header">
                    <h1>История игр</h1>
                </div>

                <div className="game-history-error">
                    {error}
                </div>

                <button
                    className="game-history-retry"
                    onClick={() => loadGames(page)}
                >
                    Повторить
                </button>
            </div>
        );
    }

    return (
        <div className="game-history">

            <div className="game-history-header">

                <div>
                    <h1>История игр</h1>

                    <div className="game-history-count">
                        Всего игр: {total}
                    </div>
                </div>

                <button
                    className="game-history-back"
                    onClick={() => navigate("/profile")}
                >
                    ← Профиль
                </button>

            </div>

            {games.length === 0 ? (
                <div className="game-history-empty">
                    <div className="game-history-empty-icon">
                        🎮
                    </div>

                    <h2>История игр пуста</h2>

                    <p>
                        Здесь появятся завершённые игры.
                    </p>

                    <button
                        onClick={() => navigate("/lobby")}
                    >
                        Найти игру
                    </button>
                </div>
            ) : (
                <>
                    <div className="game-history-table-wrapper">

                        <table className="game-history-table">

                            <thead>
                                <tr>
                                    <th>Результат</th>
                                    <th>Тип</th>
                                    <th>Поле</th>
                                    <th>Соперник</th>
                                    <th>Рейтинг</th>
                                    <th>Дата</th>
                                    <th></th>
                                </tr>
                            </thead>

                            <tbody>

                                {games.map((game) => (

                                    <tr
                                        key={game.id}
                                        className={`game-history-row result-${game.result}`}
                                    >

                                        <td>
                                            <div className="game-result">

                                                <span className="game-result-icon">
                                                    {getResultIcon(
                                                        game.result
                                                    )}
                                                </span>

                                                <span>
                                                    {getResultText(
                                                        game.result
                                                    )}
                                                </span>

                                            </div>
                                        </td>

                                        <td>
                                            <span
                                                className={`game-type game-type-${game.game_type}`}
                                            >
                                                {getGameTypeText(
                                                    game.game_type
                                                )}
                                            </span>
                                        </td>

                                        <td>
                                            <div className="game-board-size">
                                                {game.board_size}×
                                                {game.board_size}

                                                <span>
                                                    {game.win_condition}
                                                    в ряд
                                                </span>
                                            </div>
                                        </td>

                                        <td>
                                            <div className="game-opponent">

                                                <span className="game-opponent-name">
                                                    {
                                                        game.opponent
                                                            ?.username ||
                                                        "Неизвестный игрок"
                                                    }
                                                </span>

                                            </div>
                                        </td>

                                        <td>
                                            {game.rating_change === null ||
                                            game.rating_change === undefined ? (
                                                <span className="rating-empty">
                                                    —
                                                </span>
                                            ) : (
                                                <span
                                                    className={`rating-change ${getRatingClass(
                                                        game.rating_change
                                                    )}`}
                                                >
                                                    {game.rating_change > 0
                                                        ? "+"
                                                        : ""}
                                                    {game.rating_change}
                                                </span>
                                            )}
                                        </td>

                                        <td>
                                            <span className="game-date">
                                                {formatDate(
                                                    game.finished_at ||
                                                    game.created_at
                                                )}
                                            </span>
                                        </td>

                                        <td>
                                            <button
                                                className="game-open-button"
                                                onClick={() =>
                                                    handleOpenGame(
                                                        game.id
                                                    )
                                                }
                                            >
                                                Открыть игру
                                            </button>
                                        </td>

                                    </tr>

                                ))}

                            </tbody>

                        </table>

                    </div>

                    {pages > 1 && (
                        <div className="game-history-pagination">

                            <button
                                disabled={page <= 1}
                                onClick={() =>
                                    setPage((value) =>
                                        Math.max(
                                            1,
                                            value - 1
                                        )
                                    )
                                }
                            >
                                ← Назад
                            </button>

                            <span>
                                Страница {page} из {pages}
                            </span>

                            <button
                                disabled={page >= pages}
                                onClick={() =>
                                    setPage((value) =>
                                        Math.min(
                                            pages,
                                            value + 1
                                        )
                                    )
                                }
                            >
                                Далее →
                            </button>

                        </div>
                    )}

                </>
            )}

        </div>
    );
}

export default GameHistory;