import React, {
useState,
useEffect,
useRef,
useCallback
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGameState, makeMove } from '../../services/gameService';
import { useAuth } from '../../context/AuthContext';
import { getRankedMatch } from '../../services/rankedService';

const WS_BASE =
window.location.protocol === 'https:' ? 'wss://' : 'ws://';

const WS_HOST = 'localhost:8000';

const GameBoard = () => {
const { id } = useParams();
const navigate = useNavigate();
const { user } = useAuth();

const [rankedMatch, setRankedMatch] = useState(null);
const [makingMove, setMakingMove] = useState(false);
const [gameState, setGameState] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');
const [currentPlayer, setCurrentPlayer] = useState(null);
const [playerSymbol, setPlayerSymbol] = useState(null);
const [gameItemEffect, setGameItemEffect] = useState(null);
const [inventory, setInventory] = useState([]);

const wsRef = useRef(null);
const reconnectRef = useRef(null);
const mountedRef = useRef(true);

const loadInventory = useCallback(async () => {
    try {
        const token = localStorage.getItem('access_token');

        const response = await fetch(
            'http://localhost:8000/shop',
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            return;
        }

        const data = await response.json();

        if (mountedRef.current) {
            setInventory(data.inventory || []);
        }
    } catch (err) {
        console.error(
            '[SHOP] Failed to load inventory:',
            err
        );
    }
}, []);

const handleUseItem = async (itemId) => {
    try {
        setError('');

        const token = localStorage.getItem('access_token');
        const numericItemId = Number(itemId);

        console.log('[ITEM] Using item:', {
            gameId: id,
            itemId,
            numericItemId
        });

        const response = await fetch(
            `http://localhost:8000/games/${id}/item`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    item_id: numericItemId
                })
            }
        );

        const data = await response.json();

        console.log('[ITEM] Backend response:', {
            status: response.status,
            ok: response.ok,
            data
        });

        if (!response.ok) {
            let errorMessage =
                'Не удалось использовать предмет';

            if (typeof data.detail === 'string') {
                errorMessage = data.detail;
            } else if (Array.isArray(data.detail)) {
                errorMessage = data.detail
                    .map((itemError) => {
                        if (typeof itemError === 'string') {
                            return itemError;
                        }

                        return (
                            itemError.msg ||
                            JSON.stringify(itemError)
                        );
                    })
                    .join(', ');
            } else if (data.detail) {
                errorMessage = JSON.stringify(data.detail);
            }

            throw new Error(errorMessage);
        }

        console.log(
            '[ITEM] Item used successfully:',
            data
        );

        await loadInventory();
    } catch (err) {
        console.error(
            '[ITEM] Use error:',
            err
        );

        setError(
            err.message ||
            'Не удалось использовать предмет'
        );
    }
};

const loadRankedMatch = useCallback(async () => {
    let retryCount = 0;

    const load = async () => {
        try {
            const response = await getRankedMatch(id);
            const match = response.data;

            if (!mountedRef.current) {
                return;
            }

            setRankedMatch(match);

            if (
                match.player_x_rating_after === null &&
                retryCount < 10
            ) {
                retryCount += 1;

                setTimeout(() => {
                    if (mountedRef.current) {
                        load();
                    }
                }, 300);
            }
        } catch (error) {
            if (error.response?.status !== 404) {
                console.error(
                    'Ошибка загрузки информации о рейтинговом матче:',
                    error
                );
            }

            if (mountedRef.current) {
                setRankedMatch(null);
            }
        }
    };

    await load();
}, [id]);

const openWs = useCallback(() => {
    const token = localStorage.getItem('access_token');

    if (!token) {
        return;
    }

    if (wsRef.current) {
        try {
            wsRef.current.close();
        } catch (e) {
            console.error(
                '[GAME WS] Failed to close previous socket:',
                e
            );
        }

        wsRef.current = null;
    }

    const wsUrl =
        `${WS_BASE}${WS_HOST}/ws/games/${id}?token=${encodeURIComponent(token)}`;

    console.log('[GAME WS] Connecting:', wsUrl);

    const ws = new WebSocket(wsUrl);

    wsRef.current = ws;

    ws.onopen = () => {
        console.log('[GAME WS] Connected');

        (async () => {
            try {
                const resp = await getGameState(id);

                if (!mountedRef.current) {
                    return;
                }

                setGameState(resp.data);
                setCurrentPlayer(resp.data.current_player);

                if (user) {
                    if (
                        user.id === resp.data.player_x_id
                    ) {
                        setPlayerSymbol('X');
                    } else if (
                        user.id === resp.data.player_o_id
                    ) {
                        setPlayerSymbol('O');
                    } else {
                        setPlayerSymbol(null);
                    }
                }

                setLoading(false);
            } catch (err) {
                console.warn(
                    '[GAME WS] Initial REST load failed:',
                    err
                );
            }
        })();
    };

    ws.onmessage = (e) => {
        try {
            const msg = JSON.parse(e.data);

            console.log('[GAME WS] Message:', msg);

            if (msg.type === 'game_item') {
                if (!mountedRef.current) {
                    return;
                }

                setGameItemEffect({
                    id: Date.now(),
                    item: msg.item,
                    fromUserId: msg.from_user_id,
                    targetUserId: msg.target_user_id
                });

                loadInventory();

                setTimeout(() => {
                    if (mountedRef.current) {
                        setGameItemEffect(null);
                    }
                }, 1200);

                return;
            }

            if (
                msg.type === 'init' ||
                msg.type === 'update'
            ) {
                const state = msg.state;

                if (!mountedRef.current) {
                    return;
                }

                setGameState(state);
                setCurrentPlayer(state.current_player);

                if (user) {
                    if (
                        user.id === state.player_x_id
                    ) {
                        setPlayerSymbol('X');
                    } else if (
                        user.id === state.player_o_id
                    ) {
                        setPlayerSymbol('O');
                    } else {
                        setPlayerSymbol(null);
                    }
                }

                setLoading(false);
            }
        } catch (err) {
            console.error(
                '[GAME WS] Message parse error:',
                err
            );
        }
    };

    ws.onclose = (ev) => {
        console.log('[GAME WS] Closed:', ev);

        if (!mountedRef.current) {
            return;
        }

        if (reconnectRef.current) {
            clearTimeout(reconnectRef.current);
        }

        reconnectRef.current = setTimeout(() => {
            if (mountedRef.current) {
                openWs();
            }
        }, 1000);
    };

    ws.onerror = (err) => {
        console.error(
            '[GAME WS] Error:',
            err
        );

        try {
            ws.close();
        } catch (e) {
            console.error(
                '[GAME WS] Failed to close socket:',
                e
            );
        }
    };
}, [id, user, loadInventory]);

useEffect(() => {
    mountedRef.current = true;

    openWs();
    loadInventory();

    return () => {
        mountedRef.current = false;

        if (reconnectRef.current) {
            clearTimeout(reconnectRef.current);
            reconnectRef.current = null;
        }

        if (wsRef.current) {
            try {
                wsRef.current.close();
            } catch (e) {
                console.error(
                    '[GAME WS] Failed to close socket:',
                    e
                );
            }

            wsRef.current = null;
        }
    };
}, [openWs, loadInventory]);

useEffect(() => {
    mountedRef.current = true;

    loadRankedMatch();
}, [loadRankedMatch]);

useEffect(() => {
    if (gameState?.status === 'finished') {
        loadRankedMatch();
    }
}, [gameState?.status, loadRankedMatch]);

const handleCellClick = async (row, col) => {
    if (
        !gameState ||
        gameState.status !== 'in_progress' ||
        gameState.board[row][col] ||
        currentPlayer !== playerSymbol ||
        makingMove
    ) {
        return;
    }

    try {
        setError('');
        setMakingMove(true);

        await makeMove(
            id,
            row,
            col,
            playerSymbol
        );
    } catch (err) {
        console.error(
            'Ошибка хода:',
            err
        );

        setError(
            err.response?.data?.detail ||
            'Не удалось сделать ход'
        );
    } finally {
        setMakingMove(false);
    }
};

const getOpponentName = () => {
    if (!rankedMatch || !user) {
        return '';
    }

    if (
        user.id === rankedMatch.player_x_id
    ) {
        return rankedMatch.player_o_username;
    }

    return rankedMatch.player_x_username;
};

const getMyRatingBefore = () => {
    if (!rankedMatch || !user) {
        return null;
    }

    if (
        user.id === rankedMatch.player_x_id
    ) {
        return rankedMatch.player_x_rating_before;
    }

    return rankedMatch.player_o_rating_before;
};

const getMyRatingAfter = () => {
    if (!rankedMatch || !user) {
        return null;
    }

    if (
        user.id === rankedMatch.player_x_id
    ) {
        return rankedMatch.player_x_rating_after;
    }

    return rankedMatch.player_o_rating_after;
};

const getMyRatingChange = () => {
    if (!rankedMatch || !user) {
        return null;
    }

    if (
        user.id === rankedMatch.player_x_id
    ) {
        return rankedMatch.rating_change_x;
    }

    return rankedMatch.rating_change_o;
};

const getResultTitle = () => {
    if (!rankedMatch || !gameState) {
        return '';
    }

    if (
        rankedMatch.is_draw ||
        gameState.winner === 'Draw'
    ) {
        return '🤝 Ничья!';
    }

    const isWinner =
        rankedMatch.winner_id === user?.id;

    if (isWinner) {
        return '🏆 Победа!';
    }

    return '😔 Поражение';
};

const getResultClass = () => {
    if (!rankedMatch) {
        return 'alert-success';
    }

    if (rankedMatch.is_draw) {
        return 'alert-warning';
    }

    if (
        rankedMatch.winner_id === user?.id
    ) {
        return 'alert-success';
    }

    return 'alert-danger';
};

const handlePlayAgain = () => {
    if (!rankedMatch) {
        navigate('/ranked');
        return;
    }

    navigate(
        `/ranked/queue/${rankedMatch.board_size}`,
        {
            state: {
                autoJoin: true
            }
        }
    );
};

if (loading) {
    return (
        <div className="text-center mt-5">
            Загрузка игры...
        </div>
    );
}

if (!gameState) {
    return (
        <div className="alert alert-danger">
            Игра не найдена
        </div>
    );
}

const isFinished =
    gameState.status === 'finished';

const isMyItemEffect =
    gameItemEffect &&
    gameItemEffect.targetUserId === user?.id;

return (
    <>
        <style>
            {`
                .game-item-animation {
                    position: fixed;
                    z-index: 9999;
                    font-size: 70px;
                    pointer-events: none;
                    animation-duration: 1.2s;
                    animation-timing-function: ease-in;
                    animation-fill-mode: forwards;
                }

                .item-hit-me {
                    left: 50%;
                    top: 50%;
                    animation-name: throw-item;
                }

                .item-hit-opponent {
                    left: 50%;
                    top: 50%;
                    animation-name: throw-item-opponent;
                }

                @keyframes throw-item {
                    0% {
                        transform:
                            translate(-500px, -300px)
                            rotate(0deg)
                            scale(0.6);
                        opacity: 0;
                    }

                    15% {
                        opacity: 1;
                    }

                    75% {
                        transform:
                            translate(0, 0)
                            rotate(500deg)
                            scale(1.2);
                        opacity: 1;
                    }

                    90% {
                        transform:
                            translate(0, 0)
                            rotate(620deg)
                            scale(1.5);
                    }

                    100% {
                        transform:
                            translate(0, 0)
                            rotate(720deg)
                            scale(0);
                        opacity: 0;
                    }
                }

                @keyframes throw-item-opponent {
                    0% {
                        transform:
                            translate(500px, -300px)
                            rotate(0deg)
                            scale(0.6);
                        opacity: 0;
                    }

                    15% {
                        opacity: 1;
                    }

                    75% {
                        transform:
                            translate(0, 0)
                            rotate(-500deg)
                            scale(1.2);
                        opacity: 1;
                    }

                    90% {
                        transform:
                            translate(0, 0)
                            rotate(-620deg)
                            scale(1.5);
                    }

                    100% {
                        transform:
                            translate(0, 0)
                            rotate(-720deg)
                            scale(0);
                        opacity: 0;
                    }
                }
            `}
        </style>

        {gameItemEffect && (
            <div
                className={`game-item-animation ${
                    isMyItemEffect
                        ? 'item-hit-me'
                        : 'item-hit-opponent'
                }`}
            >
                {gameItemEffect.item === 'egg' && '🥚'}
                {gameItemEffect.item === 'tomato' && '🍅'}
                {gameItemEffect.item === 'poop' && '💩'}
            </div>
        )}

        <div className="container mt-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>
                    {rankedMatch
                        ? '🏆 Рейтинговый матч'
                        : `Игра #${id}`}
                </h2>

                <div>
                    <span className="badge bg-info">
                        {playerSymbol === 'X'
                            ? 'Крестики (X)'
                            : playerSymbol === 'O'
                                ? 'Нолики (O)'
                                : 'Наблюдатель'}
                    </span>
                </div>
            </div>

            {rankedMatch && (
                <div className="card shadow-sm mb-4">
                    <div className="card-body">
                        <div className="text-center mb-3">
                            <h5 className="mb-1">
                                🏆 Рейтинговый матч
                            </h5>

                            <small className="text-muted">
                                {rankedMatch.board_size}
                                {' × '}
                                {rankedMatch.board_size}
                                {' • '}
                                Победа:{' '}
                                {rankedMatch.board_size}
                                {' в ряд'}
                            </small>
                        </div>

                        <div className="row align-items-center text-center">
                            <div className="col">
                                <div className="fw-bold">
                                    {rankedMatch.player_x_username}
                                </div>

                                <div className="text-warning">
                                    ⭐{' '}
                                    {rankedMatch.player_x_rating_before}
                                </div>

                                {user?.id === rankedMatch.player_x_id && (
                                    <small className="text-muted">
                                        Вы • X
                                    </small>
                                )}
                            </div>

                            <div className="col-auto">
                                <div className="fs-4 fw-bold text-muted">
                                    VS
                                </div>
                            </div>

                            <div className="col">
                                <div className="fw-bold">
                                    {rankedMatch.player_o_username}
                                </div>

                                <div className="text-warning">
                                    ⭐{' '}
                                    {rankedMatch.player_o_rating_before}
                                </div>

                                {user?.id === rankedMatch.player_o_id && (
                                    <small className="text-muted">
                                        Вы • O
                                    </small>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="alert alert-danger">
                    {error}
                </div>
            )}

            {gameState.status === 'in_progress' &&
                playerSymbol && (
                    <div className="card shadow-sm mb-4">
                        <div className="card-body">
                            <div className="fw-bold mb-3">
                                🎒 Предметы
                            </div>

                            <div className="d-flex flex-wrap gap-2">
                                {inventory.length === 0 ? (
                                    <span className="text-muted">
                                        У вас пока нет предметов
                                    </span>
                                ) : (
                                    inventory.map((entry) => (
                                        <button
                                            key={entry.item.id}
                                            className="btn btn-outline-secondary"
                                            onClick={() =>
                                                handleUseItem(
                                                    entry.item.id
                                                )
                                            }
                                            disabled={
                                                gameState.status !==
                                                'in_progress'
                                            }
                                        >
                                            {entry.item.name}

                                            <span className="badge bg-secondary ms-2">
                                                {entry.quantity}
                                            </span>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

            {gameState.winner && !rankedMatch && (
                <div
                    className={`alert ${
                        gameState.winner === 'Draw'
                            ? 'alert-warning'
                            : 'alert-success'
                    }`}
                >
                    {gameState.winner === 'Draw'
                        ? 'Ничья!'
                        : `Победитель: ${gameState.winner}`}
                </div>
            )}

            {isFinished && rankedMatch && (
                <div
                    className={`alert ${getResultClass()} text-center`}
                >
                    <h3 className="mb-3">
                        {getResultTitle()}
                    </h3>

                    {!rankedMatch.is_draw && (
                        <div className="mb-3">
                            <strong>
                                {rankedMatch.winner_id === user?.id
                                    ? 'Вы победили!'
                                    : `${getOpponentName()} победил`}
                            </strong>
                        </div>
                    )}

                    <div className="card bg-transparent border-0">
                        <div className="card-body">
                            <div className="fw-bold mb-2">
                                ⭐ Ваш рейтинг
                            </div>

                            <div className="fs-4">
                                {getMyRatingBefore()}

                                <span className="mx-2">
                                    →
                                </span>

                                <strong>
                                    {getMyRatingAfter() ??
                                        'Обновление...'}
                                </strong>
                            </div>

                            {getMyRatingChange() !== null && (
                                <div
                                    className={`fw-bold fs-5 ${
                                        getMyRatingChange() > 0
                                            ? 'text-success'
                                            : getMyRatingChange() < 0
                                                ? 'text-danger'
                                                : 'text-muted'
                                    }`}
                                >
                                    {getMyRatingChange() > 0
                                        ? `+${getMyRatingChange()}`
                                        : getMyRatingChange()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {!gameState.winner &&
                gameState.status === 'in_progress' && (
                    <div className="alert alert-info mb-3">
                        Текущий ход:{' '}
                        {currentPlayer === 'X'
                            ? 'Крестики (X)'
                            : 'Нолики (O)'}
                    </div>
                )}

            <div
                className="game-board mx-auto"
                style={{
                    maxWidth: '600px',
                    display: 'grid',
                    gridTemplateColumns:
                        `repeat(${gameState.board.length}, 1fr)`,
                    gap: '5px'
                }}
            >
                {gameState.board.map((row, rowIndex) =>
                    row.map((cell, colIndex) => (
                        <div
                            key={`${rowIndex}-${colIndex}`}
                            className={`
                                cell
                                d-flex
                                align-items-center
                                justify-content-center
                                ${cell
                                    ? 'bg-light'
                                    : 'bg-white'}
                                ${
                                    !cell &&
                                    gameState.status === 'in_progress' &&
                                    currentPlayer === playerSymbol
                                        ? 'cursor-pointer'
                                        : ''
                                }
                            `}
                            style={{
                                aspectRatio: '1/1',
                                border: '1px solid #ddd',
                                fontSize: '2rem',
                                fontWeight: 'bold',
                                transition: 'all 0.2s'
                            }}
                            onClick={() =>
                                handleCellClick(
                                    rowIndex,
                                    colIndex
                                )
                            }
                        >
                            {cell === 'X' ? (
                                <span className="text-primary">
                                    X
                                </span>
                            ) : cell === 'O' ? (
                                <span className="text-danger">
                                    O
                                </span>
                            ) : null}
                        </div>
                    ))
                )}
            </div>

            <div className="mt-4 text-center">
                {isFinished && rankedMatch ? (
                    <>
                        <button
                            className="btn btn-success me-2 mb-2"
                            onClick={handlePlayAgain}
                        >
                            🏆 Играть ещё раз
                        </button>

                        <button
                            className="btn btn-primary me-2 mb-2"
                            onClick={() =>
                                navigate('/ranked')
                            }
                        >
                            📊 Рейтинговые матчи
                        </button>

                        <button
                            className="btn btn-secondary mb-2"
                            onClick={() =>
                                navigate('/lobby')
                            }
                        >
                            🎮 Обычное лобби
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            className="btn btn-secondary me-2"
                            onClick={() =>
                                navigate('/lobby')
                            }
                        >
                            Вернуться в лобби
                        </button>

                        {isFinished && (
                            <button
                                className="btn btn-primary"
                                onClick={() =>
                                    navigate('/lobby')
                                }
                            >
                                Создать новую игру
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    </>
);


};

export default GameBoard;
