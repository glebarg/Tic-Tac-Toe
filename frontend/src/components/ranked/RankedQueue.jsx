import React, {
    useCallback,
    useEffect,
    useRef,
    useState
} from 'react';

import {
    getValidAccessToken
} from '../../services/authService';

import {
    useNavigate,
    useParams
} from 'react-router-dom';

import {
    joinRankedQueue,
    leaveRankedQueue
} from '../../services/rankedService';


const WS_BASE =
    window.location.protocol === 'https:'
        ? 'wss://'
        : 'ws://';

const WS_HOST = 'localhost:8000';


const RankedQueue = () => {
    const { boardSize } = useParams();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [joining, setJoining] = useState(true);
    const wsRef = useRef(null);
    const mountedRef = useRef(false);
    const joinedQueueRef = useRef(false);
    const joiningRef = useRef(false);
    const leavingRef = useRef(false);
    const navigatingRef = useRef(false);
    const matchHandledRef = useRef(false);


    const closeWebSocket = useCallback(() => {
        const ws = wsRef.current;

        if (!ws) {
            return;
        }

        try {
           
            ws.onopen = null;
            ws.onmessage = null;
            ws.onerror = null;
            ws.onclose = null;

            if (
                ws.readyState === WebSocket.OPEN ||
                ws.readyState === WebSocket.CONNECTING
            ) {
                ws.close();
            }
        } catch (error) {
            console.error(
                '[RANKED WS] Close error:',
                error
            );
        }

        wsRef.current = null;
    }, []);


   

    const goToGame = useCallback((gameId) => {
        if (!gameId) {
            console.error(
                '[RANKED] Match found without game_id'
            );

            return;
        }
        if (matchHandledRef.current) {
            return;
        }

        matchHandledRef.current = true;

        console.log(
            '[RANKED] Match found. Game ID:',
            gameId
        );
        joinedQueueRef.current = false;
        navigatingRef.current = true;

        setJoining(false);
        closeWebSocket();
        navigate(`/game/${gameId}`);
    }, [
        closeWebSocket,
        navigate
    ]);

    const connectWebSocket = useCallback((token) => {
        return new Promise((resolve, reject) => {

            if (!mountedRef.current) {
                reject(
                    new Error(
                        'Component is not mounted'
                    )
                );

                return;
            }

            if (navigatingRef.current) {
                reject(
                    new Error(
                        'Navigation already started'
                    )
                );

                return;
            }

            if (
                wsRef.current &&
                wsRef.current.readyState === WebSocket.OPEN
            ) {
                resolve();
                return;
            }

            closeWebSocket();

            const wsUrl =
                `${WS_BASE}${WS_HOST}/ws/ranked/${boardSize}` +
                `?token=${encodeURIComponent(token)}`;

            console.log(
                '[RANKED WS] Connecting:',
                wsUrl
            );

            let ws;

            try {
                ws = new WebSocket(wsUrl);

                wsRef.current = ws;
            } catch (error) {
                console.error(
                    '[RANKED WS] WebSocket creation error:',
                    error
                );

                reject(error);

                return;
            }

            let resolved = false;

            ws.onopen = () => {
                console.log(
                    '[RANKED WS] Connected'
                );

                if (
                    !mountedRef.current ||
                    navigatingRef.current
                ) {
                    try {
                        ws.close();
                    } catch (error) {
                        console.error(error);
                    }

                    if (!resolved) {
                        resolved = true;

                        reject(
                            new Error(
                                'Component unmounted'
                            )
                        );
                    }

                    return;
                }

                try {
                    ws.send('connected');
                } catch (error) {
                    console.error(
                        '[RANKED WS] Ping error:',
                        error
                    );
                }

                if (!resolved) {
                    resolved = true;

                    resolve();
                }
            };

            ws.onmessage = (event) => {
                if (!mountedRef.current) {
                    return;
                }

                if (navigatingRef.current) {
                    return;
                }

                try {
                    const message =
                        JSON.parse(event.data);

                    console.log(
                        '[RANKED WS] Message:',
                        message
                    );

                    if (
                        message?.type ===
                        'match_found'
                    ) {
                        const gameId =
                            message.game_id;

                        if (!gameId) {
                            console.error(
                                '[RANKED] match_found without game_id'
                            );

                            return;
                        }

                        goToGame(gameId);
                    }

                } catch (error) {
                    console.error(
                        '[RANKED WS] Message parse error:',
                        error
                    );
                }
            };


            ws.onerror = (error) => {
                console.error(
                    '[RANKED WS] Error:',
                    error
                );

                if (!resolved) {
                    resolved = true;

                    reject(
                        new Error(
                            'Ошибка соединения с сервером'
                        )
                    );
                }

                if (
                    mountedRef.current &&
                    !navigatingRef.current
                ) {
                    setError(
                        'Ошибка соединения с сервером'
                    );
                }
            };

            ws.onclose = (event) => {
                console.log(
                    '[RANKED WS] Closed:',
                    event.code,
                    event.reason
                );

                if (wsRef.current === ws) {
                    wsRef.current = null;
                }

            };
        });
    }, [
        boardSize,
        closeWebSocket,
        goToGame
    ]);


    const startQueue = useCallback(async () => {
        if (!mountedRef.current) {
            return;
        }

        if (joiningRef.current) {
            console.log(
                '[RANKED QUEUE] Join already in progress'
            );

            return;
        }

        if (joinedQueueRef.current) {
            console.log(
                '[RANKED QUEUE] Already joined'
            );

            return;
        }

        if (navigatingRef.current) {
            return;
        }
        const token =
            await getValidAccessToken();

        if (!token) {
            navigate('/login');

            return;
        }

        joiningRef.current = true;

        setError('');
        setJoining(true);

        matchHandledRef.current = false;

        try {



            console.log(
                '[RANKED WS] Connecting before joining queue'
            );

            await connectWebSocket(token);


            if (
                !mountedRef.current ||
                navigatingRef.current
            ) {
                return;
            }


            console.log(
                '[RANKED QUEUE] Joining queue:',
                boardSize
            );

            const queueResponse =
                await joinRankedQueue(
                    Number(boardSize)
                );


            console.log(
                '[RANKED QUEUE] Join response:',
                queueResponse
            );


            if (
                !mountedRef.current ||
                navigatingRef.current
            ) {
                return;
            }

            const result =
                queueResponse?.data ||
                queueResponse;


            console.log(
                '[RANKED QUEUE] Parsed result:',
                result
            );

            if (
                result?.status === 'matched' &&
                result?.game_id
            ) {
                console.log(
                    '[RANKED QUEUE] Match found from HTTP:',
                    result.game_id
                );

                goToGame(
                    result.game_id
                );

                return;
            }

            if (
                result?.status ===
                'already_in_queue'
            ) {
                joinedQueueRef.current = true;

                setJoining(false);

                console.log(
                    '[RANKED QUEUE] Already in queue'
                );

                return;
            }

            if (
                result?.status === 'waiting'
            ) {
                joinedQueueRef.current = true;

                setJoining(false);

                console.log(
                    '[RANKED QUEUE] Waiting for opponent...'
                );

                return;
            }


            console.warn(
                '[RANKED QUEUE] Unknown response:',
                result
            );

   
            joinedQueueRef.current = true;

            setJoining(false);

        } catch (error) {
            console.error(
                '[RANKED QUEUE] Join error:',
                error
            );

            if (!mountedRef.current) {
                return;
            }

            setJoining(false);

 
            if (
                error?.response?.data?.detail
            ) {
                setError(
                    error.response.data.detail
                );
            } else {
                setError(
                    error?.message ||
                    'Не удалось войти в очередь'
                );
            }

            joinedQueueRef.current = false;

            closeWebSocket();

        } finally {
            joiningRef.current = false;
        }
    }, [
        boardSize,
        closeWebSocket,
        connectWebSocket,
        goToGame,
        navigate
    ]);


    useEffect(() => {
        mountedRef.current = true;

        joinedQueueRef.current = false;
        joiningRef.current = false;
        leavingRef.current = false;
        navigatingRef.current = false;
        matchHandledRef.current = false;

        startQueue();



        return () => {
            console.log(
                '[RANKED QUEUE] Unmount'
            );

            mountedRef.current = false;


            closeWebSocket();
        };

    }, [
        startQueue,
        closeWebSocket
    ]);




    const handleCancel = async () => {

   
        if (navigatingRef.current) {
            return;
        }

        if (leavingRef.current) {
            console.log(
                '[RANKED QUEUE] Leave already in progress'
            );

            return;
        }

        leavingRef.current = true;

    
        navigatingRef.current = true;

        try { 

            closeWebSocket();

            const wasJoined =
                joinedQueueRef.current;


            joinedQueueRef.current = false;



            if (wasJoined) {
                console.log(
                    '[RANKED QUEUE] Leaving queue:',
                    boardSize
                );

                await leaveRankedQueue(
                    Number(boardSize)
                );

                console.log(
                    '[RANKED QUEUE] Left queue'
                );
            } else {
                console.log(
                    '[RANKED QUEUE] DELETE skipped - not joined'
                );
            }

        } catch (error) {

            console.error(
                '[RANKED QUEUE] Leave error:',
                error
            );

        } finally {

            leavingRef.current = false;

            navigate('/ranked');
        }
    };




    return (
        <div className="container mt-5">

            <div
                className="card shadow-sm mx-auto"
                style={{
                    maxWidth: '500px'
                }}
            >

                <div
                    className="card-body text-center p-5"
                >

                    <h2 className="mb-4">
                        🏆 Поиск соперника
                    </h2>


                    <div className="display-5 mb-3">
                        {boardSize} × {boardSize}
                    </div>


                    <div className="text-muted mb-4">
                        {joining
                            ? 'Подключаемся к очереди...'
                            : 'Ищем игрока для рейтинговой игры...'}
                    </div>


                    {!error && (
                        <div
                            className="spinner-border mb-4"
                            role="status"
                        >
                            <span className="visually-hidden">
                                Поиск...
                            </span>
                        </div>
                    )}


                    {error && (
                        <div className="alert alert-danger">
                            {error}
                        </div>
                    )}


                    <div>
                        <button
                            className="btn btn-secondary"
                            onClick={handleCancel}
                            disabled={
                                joining ||
                                leavingRef.current
                            }
                        >
                            Отменить поиск
                        </button>
                    </div>

                </div>

            </div>

        </div>
    );
};


export default RankedQueue;
