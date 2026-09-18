import React from 'react';


const GameList = ({ games, userId, onJoin, navigate }) => {
    const handleJoinGame = async (gameId) => {
        try {
            await onJoin(gameId);
            navigate(`/game/${gameId}`);
        } catch (error) {
            console.error('Failed to join game', error);
        }
    };

    if (games.length === 0) {
        return (
            <div className="alert alert-info">
                Нет доступных игр. Создайте новую игру!
            </div>
        );
    }

    return (
        <div className="list-group">
            {games.map(game => (
                <div key={game.id} className="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <h5 className="mb-1">
                            {game.board_size}x{game.board_size} | Победа: {game.win_condition} в ряд
                        </h5>
                        <small>
                            Создатель: {game.player_x.username} | 
                            Тип: {game.game_type === 'computer' ? 'Против компьютера' : 'Против игрока'}
                        </small>
                    </div>
                    
                    {game.status === 'waiting' && game.player_x_id !== userId ? (
                        <button 
                            className="btn btn-success"
                            onClick={() => handleJoinGame(game.id)}
                        >
                            Присоединиться
                        </button>
                    ) : (
                        <button 
                            className="btn btn-primary"
                            onClick={() => navigate(`/game/${game.id}`)}
                        >
                            {game.player_x_id === userId ? 'Продолжить' : 'Просмотр'}
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
};

export default GameList;