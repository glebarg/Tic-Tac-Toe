import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getNewsById } from '../../services/newsService';

const NewsDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [news, setNews] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadNews = async () => {
            try {
                setLoading(true);
                setError('');

                const response = await getNewsById(id);

                setNews(response.data);
            } catch (err) {
                console.error(
                    'Ошибка загрузки новости:',
                    err
                );

                setError(
                    err.response?.data?.detail ||
                    'Новость не найдена'
                );
            } finally {
                setLoading(false);
            }
        };

        loadNews();
    }, [id]);

    if (loading) {
        return (
            <div className="container mt-5 text-center">
                <div
                    className="spinner-border"
                    role="status"
                >
                    <span className="visually-hidden">
                        Загрузка...
                    </span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mt-4">

                <div className="alert alert-danger">
                    {error}
                </div>

                <button
                    className="btn btn-secondary"
                    onClick={() => navigate('/')}
                >
                    ← Вернуться к новостям
                </button>

            </div>
        );
    }

    if (!news) {
        return null;
    }

    return (
        <div className="container mt-4">

            <button
                className="btn btn-outline-secondary mb-4"
                onClick={() => navigate('/')}
            >
                ← Все новости
            </button>

            <div className="row justify-content-center">

                <div className="col-lg-9">

                    <article className="card shadow-sm">

                        {news.image_url && (
                            <img
                                src={news.image_url}
                                className="card-img-top"
                                alt={news.title}
                                style={{
                                    maxHeight: '500px',
                                    objectFit: 'cover'
                                }}
                            />
                        )}

                        <div className="card-body p-4 p-lg-5">

                            <h1 className="mb-3">
                                {news.title}
                            </h1>

                            <div className="text-muted mb-4">

                                <span>
                                    Автор:{' '}
                                    {news.author?.username ||
                                        'Администрация'}
                                </span>

                                {' • '}

                                <span>
                                    {new Date(
                                        news.published_at ||
                                        news.created_at
                                    ).toLocaleString()}
                                </span>

                            </div>

                            <hr />

                            <div
                                style={{
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: '1.8',
                                    fontSize: '1.05rem'
                                }}
                            >
                                {news.content}
                            </div>

                        </div>

                    </article>

                </div>

            </div>

        </div>
    );
};

export default NewsDetailPage;