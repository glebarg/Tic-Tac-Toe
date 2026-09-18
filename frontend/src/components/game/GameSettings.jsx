import React, { useState } from 'react';

const GameSettings = ({ onCreate, onCancel }) => {
    const [boardSize, setBoardSize] = useState(3);
    const [winCondition, setWinCondition] = useState(3);
    const [gameType, setGameType] = useState('human');

    const handleSubmit = (e) => {
        e.preventDefault();
        onCreate({ boardSize, winCondition, gameType });
    };

    return (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Настройки игры</h5>
                        <button type="button" className="btn-close" onClick={onCancel}></button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="mb-3">
                                <label className="form-label">Размер поля</label>
                                <select 
                                    className="form-select"
                                    value={boardSize}
                                    onChange={(e) => setBoardSize(parseInt(e.target.value))}
                                >
                                    {[3, 4, 5, 6, 7, 8, 9, 10].map(size => (
                                        <option key={size} value={size}>{size}x{size}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="mb-3">
                                <label className="form-label">Условие победы</label>
                                <input 
                                    type="number" 
                                    className="form-control"
                                    min="3"
                                    max={boardSize}
                                    value={winCondition}
                                    onChange={(e) => setWinCondition(parseInt(e.target.value))}
                                />
                                <div className="form-text">
                                    Сколько символов подряд нужно для победы (3-{boardSize})
                                </div>
                            </div>
                            
                            <div className="mb-3">
                                <label className="form-label">Тип игры</label>
                                <select 
                                    className="form-select"
                                    value={gameType}
                                    onChange={(e) => setGameType(e.target.value)}
                                >
                                    <option value="human">С другим игроком</option>
                                    <option value="computer">С компьютером</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onCancel}>
                                Отмена
                            </button>
                            <button type="submit" className="btn btn-primary">
                                Создать игру
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default GameSettings;