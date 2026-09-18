import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNews } from '../../services/newsService';

const NewsPage = () => {
    const navigate = useNavigate();

    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadNews = async () => {
            try {
                setLoading(true);
                setError('');

                const response = await getNews();

                setNews(response.data);
            } catch (err) {
                console.error('Ошибка загрузки новостей:', err);

                setError(
                    err.response?.data?.detail ||
                    'Не удалось загрузить новости'
                );
            } finally {
                setLoading(false);
            }
        };

        loadNews();
    }, []);

    if (loading) {
        return (
            <div className="container mt-5">
                <div className="text-center">
                    <div
                        className="spinner-border"
                        role="status"
                    >
                        <span className="visually-hidden">
                            Загрузка...
                        </span>
                    </div>

                    <p className="text-muted mt-3">
                        Загружаем новости...
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mt-4">
                <div className="alert alert-danger">
                    <h4>Ошибка</h4>
                    <p className="mb-0">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mt-4">

     
            <div className="mb-4">
                <h1>📰 Новости</h1>

                <p className="text-muted mb-0">
                    Последние новости и обновления Tic-Tac-Toe
                </p>
            </div>

            <div className="row">

                <div className="col-lg-8">

                    {news.length === 0 ? (
                        <div className="card shadow-sm">
                            <div className="card-body text-center py-5">

                                <div
                                    style={{
                                        fontSize: '3rem'
                                    }}
                                >
                                    📰
                                </div>

                                <h3 className="mt-3">
                                    Новостей пока нет
                                </h3>

                                <p className="text-muted">
                                    Здесь появятся новости и обновления
                                    игры.
                                </p>

                            </div>
                        </div>
                    ) : (
                        news.map((item) => (
                            <div
                                className="card shadow-sm mb-4"
                                key={item.id}
                            >
                               
                                {item.image_url && (
                                    <img
                                        src={item.image_url}
                                        className="card-img-top"
                                        alt={item.title}
                                        style={{
                                            maxHeight: '350px',
                                            objectFit: 'cover'
                                        }}
                                    />
                                )}

                                <div className="card-body p-4">

                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <h2 className="mb-0">
                                            {item.title}
                                        </h2>

                                        <small className="text-muted ms-3">
                                            {new Date(
                                                item.published_at ||
                                                item.created_at
                                            ).toLocaleDateString()}
                                        </small>
                                    </div>

                                    <hr />

                                    <p className="text-muted">
                                        Автор:{' '}
                                        {item.author?.username ||
                                            'Администрация'}
                                    </p>

                                    <p>
                                        {item.content.length > 250
                                            ? `${item.content.slice(0, 250)}...`
                                            : item.content}
                                    </p>

                                    <button
                                        className="btn btn-primary"
                                        onClick={() =>
                                            navigate(
                                                `/news/${item.id}`
                                            )
                                        }
                                    >
                                        Читать полностью →
                                    </button>

                                </div>
                            </div>
                        ))
                    )}

                </div>

               
                <div className="col-lg-4">

                   
                    <div className="card shadow-sm mb-4">
                        <div className="card-body">

                            <h4>🎮 Играть</h4>

                            <p className="text-muted">
                                Выберите режим игры и начните матч.
                            </p>

                            <button
                                className="btn btn-primary w-100 mb-2"
                                onClick={() =>
                                    navigate('/lobby')
                                }
                            >
                                Обычная игра
                            </button>

                            <button
                                className="btn btn-warning w-100"
                                onClick={() =>
                                    navigate('/ranked')
                                }
                            >
                                🏆 Рейтинговая игра
                            </button>

                        </div>
                    </div>

                 
                    <div className="card shadow-sm mb-4">
                        <div className="card-body">

                            <h4>💡 Есть идея?</h4>

                            <p className="text-muted">
                                Предложите свою новость или интересное
                                событие для публикации.
                            </p>

                            <button
                                className="btn btn-outline-primary w-100"
                                onClick={() =>
                                    navigate('/news/create')
                                }
                            >
                                Предложить новость
                            </button>

                        </div>
                    </div>

                    
                    <div className="card shadow-sm">
                        <div className="card-body">

                            <h4>👤 Профиль</h4>

                            <p className="text-muted">
                                Просматривайте свою статистику и
                                историю игр.
                            </p>

                            <button
                                className="btn btn-outline-secondary w-100"
                                onClick={() =>
                                    navigate('/profile')
                                }
                            >
                                Открыть профиль
                            </button>

                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};

export default NewsPage;