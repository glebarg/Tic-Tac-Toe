import React, {
useState,
useEffect,
useRef,
useCallback
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
createGame,
getGames,
joinGame
} from '../../services/gameService';
import GameList from './GameList';
import GameSettings from './GameSettings';

const WS_BASE =
window.location.protocol === 'https:' ? 'wss://' : 'ws://';

const WS_HOST = 'localhost:8000';

const Lobby = () => {
const { user } = useAuth();
const navigate = useNavigate();
const [games, setGames] = useState([]);
const [showSettings, setShowSettings] = useState(false);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');

const wsRef = useRef(null);
const reconnectRef = useRef(null);
const mountedRef = useRef(true);

const loadGames = useCallback(async () => {
    try {
        setLoading(true);

        const response = await getGames();

        if (mountedRef.current) {
            setGames(response.data);
        }
    } catch (error) {
        console.error(
            'Ошибка загрузки игр:',
            error
        );

        if (mountedRef.current) {
            setError(
                'Не удалось загрузить список игр'
            );
        }
    } finally {
        if (mountedRef.current) {
            setLoading(false);
        }
    }
}, []);

const openWs = useCallback(() => {
    if (!mountedRef.current) {
        return;
    }

    if (wsRef.current) {
        try {
            wsRef.current.close();
        } catch (e) {
            console.error(
                '[LOBBY WS] Failed to close previous socket:',
                e
            );
        }

        wsRef.current = null;
    }

    const wsUrl =
        `${WS_BASE}${WS_HOST}/ws/lobby`;

    console.log(
        '[LOBBY WS] Connecting...'
    );

    const ws = new WebSocket(wsUrl);

    wsRef.current = ws;

    ws.onopen = () => {
        console.log(
            '[LOBBY WS] Connected'
        );
    };

    ws.onmessage = (event) => {
        try {
            const message =
                JSON.parse(event.data);

            console.log(
                '[LOBBY WS] Message:',
                message
            );

            if (
                message.type ===
                'game_created'
            ) {
                const newGame =
                    message.game;

                setGames(
                    prevGames => {
                        const alreadyExists =
                            prevGames.some(
                                game =>
                                    game.id ===
                                    newGame.id
                            );

                        if (
                            alreadyExists
                        ) {
                            return prevGames;
                        }

                        return [
                            ...prevGames,
                            newGame
                        ];
                    }
                );
            }

            if (
                message.type ===
                'game_updated'
            ) {
                const updatedGame =
                    message.game;

                setGames(
                    prevGames =>
                        prevGames.map(
                            game =>
                                game.id ===
                                updatedGame.id
                                    ? updatedGame
                                    : game
                        )
                );
            }

            if (
                message.type ===
                'game_removed'
            ) {
                const gameId =
                    message.game_id;

                setGames(
                    prevGames =>
                        prevGames.filter(
                            game =>
                                game.id !==
                                gameId
                        )
                );
            }
        } catch (error) {
            console.error(
                '[LOBBY WS] Message parse error:',
                error
            );
        }
    };

    ws.onclose = (event) => {
        console.log(
            '[LOBBY WS] Closed:',
            event.code,
            event.reason
        );

        if (!mountedRef.current) {
            return;
        }

        if (reconnectRef.current) {
            clearTimeout(
                reconnectRef.current
            );
        }

        reconnectRef.current =
            setTimeout(() => {
                if (
                    mountedRef.current
                ) {
                    openWs();
                }
            }, 1000);
    };

    ws.onerror = (error) => {
        console.error(
            '[LOBBY WS] Error:',
            error
        );

        try {
            ws.close();
        } catch (e) {
            console.error(
                e
            );
        }
    };
}, []);

useEffect(() => {
    mountedRef.current = true;

    loadGames();
    openWs();

    return () => {
        mountedRef.current = false;

        if (reconnectRef.current) {
            clearTimeout(
                reconnectRef.current
            );

            reconnectRef.current =
                null;
        }

        if (wsRef.current) {
            try {
                wsRef.current.close();
            } catch (e) {
                console.error(
                    e
                );
            }

            wsRef.current = null;
        }
    };
}, [loadGames, openWs]);

const handleCreateGame = async (
    settings
) => {
    try {
        setLoading(true);
        setError('');

        const response =
            await createGame(
                settings.boardSize,
                settings.winCondition,
                settings.gameType
            );

        navigate(
            `/game/${response.data.id}`
        );
    } catch (error) {
        console.error(
            'Ошибка создания игры:',
            error
        );

        setError(
            'Не удалось создать игру'
        );

        setLoading(false);
    }
};

return (
    <div className="container mt-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>
                Лобби игр
            </h2>

            <button
                className="btn btn-primary"
                onClick={() =>
                    setShowSettings(true)
                }
            >
                Создать игру
            </button>
        </div>

        {error && (
            <div className="alert alert-danger">
                {error}
            </div>
        )}

        {loading ? (
            <div className="text-center">
                Загрузка игр...
            </div>
        ) : (
            <GameList
                games={games}
                userId={user.id}
                onJoin={joinGame}
                navigate={navigate}
            />
        )}

        {showSettings && (
            <GameSettings
                onCreate={
                    handleCreateGame
                }
                onCancel={() =>
                    setShowSettings(false)
                }
            />
        )}
    </div>
);


};

export default Lobby;
