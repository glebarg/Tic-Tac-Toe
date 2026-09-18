import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyNews } from '../../services/newsService';

const MyNewsPage = () => {
    const navigate = useNavigate();

    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadNews = async () => {
            try {
                setLoading(true);
                setError('');

                const response = await getMyNews();

                setNews(response.data);
            } catch (err) {
                console.error(
                    'Ошибка загрузки моих новостей:',
                    err
                );

                const detail = err.response?.data?.detail;
                let errorMessage = 'Не удалось загрузить ваши новости';

                if (typeof detail === 'string') {
                    errorMessage = detail;
                } else if (Array.isArray(detail)) {
                    errorMessage = detail
                        .map((item) => item.msg || 'Ошибка валидации')
                        .join(', ');
                }

                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        loadNews();
    }, []);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return (
                    <span className="badge bg-warning text-dark">
                        🟡 На модерации
                    </span>
                );

            case 'published':
                return (
                    <span className="badge bg-success">
                        🟢 Опубликовано
                    </span>
                );

            case 'rejected':
                return (
                    <span className="badge bg-danger">
                        🔴 Отклонено
                    </span>
                );

            default:
                return (
                    <span className="badge bg-secondary">
                        {status}
                    </span>
                );
        }
    };

    const getStatusDescription = (item) => {
        switch (item.status) {
            case 'pending':
                return 'Новость ожидает проверки администратора.';

            case 'published':
                return 'Новость опубликована на сайте.';

            case 'rejected':
                return item.rejection_reason
                    ? `Причина: ${item.rejection_reason}`
                    : 'Новость была отклонена администратором.';

            default:
                return '';
        }
    };

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

                <p className="text-muted mt-3">
                    Загружаем ваши новости...
                </p>

            </div>
        );
    }

    return (
        <div className="container mt-4">

            <div className="d-flex justify-content-between align-items-center mb-4">

                <div>
                    <h1>📝 Мои новости</h1>

                    <p className="text-muted mb-0">
                        История предложенных вами новостей
                    </p>
                </div>

                <div className="d-flex gap-2">

                    <button
                        className="btn btn-primary"
                        onClick={() =>
                            navigate('/news/create')
                        }
                    >
                        💡 Предложить новость
                    </button>

                    <button
                        className="btn btn-outline-secondary"
                        onClick={() => navigate('/')}
                    >
                        ← Новости
                    </button>

                </div>

            </div>

            
            {error && (
                <div className="alert alert-danger">
                    {error}
                </div>
            )}

            {!error && news.length === 0 && (
                <div className="card shadow-sm">

                    <div className="card-body text-center py-5">

                        <div
                            style={{
                                fontSize: '3rem'
                            }}
                        >
                            📝
                        </div>

                        <h3 className="mt-3">
                            Вы ещё не предлагали новости
                        </h3>

                        <p className="text-muted">
                            Предложите первую новость для нашего
                            сайта.
                        </p>

                        <button
                            className="btn btn-primary"
                            onClick={() =>
                                navigate('/news/create')
                            }
                        >
                            💡 Предложить новость
                        </button>

                    </div>

                </div>
            )}

         
            <div className="row">

                {news.map((item) => (
                    <div
                        className="col-lg-8 mb-4"
                        key={item.id}
                    >

                        <div className="card shadow-sm">

                            {item.image_url && (
                                <img
                                    src={item.image_url}
                                    className="card-img-top"
                                    alt={item.title}
                                    style={{
                                        maxHeight: '300px',
                                        objectFit: 'cover'
                                    }}
                                />
                            )}

                            <div className="card-body p-4">

                                <div className="d-flex justify-content-between align-items-start mb-3">

                                    <h3 className="mb-0">
                                        {item.title}
                                    </h3>

                                    <div className="ms-3">
                                        {getStatusBadge(
                                            item.status
                                        )}
                                    </div>

                                </div>

                                <p className="text-muted mb-2">
                                    Создано:{' '}
                                    {new Date(
                                        item.created_at
                                    ).toLocaleString()}
                                </p>

                                <hr />

                                <p
                                    style={{
                                        whiteSpace: 'pre-wrap'
                                    }}
                                >
                                    {item.content.length > 500
                                        ? `${item.content.slice(
                                              0,
                                              500
                                          )}...`
                                        : item.content}
                                </p>

                                <div className="alert alert-light border mb-0">
                                    {getStatusDescription(item)}
                                </div>

                            
                                {item.status === 'published' && (
                                    <button
                                        className="btn btn-primary mt-3"
                                        onClick={() =>
                                            navigate(
                                                `/news/${item.id}`
                                            )
                                        }
                                    >
                                        Читать новость →
                                    </button>
                                )}

                            </div>

                        </div>

                    </div>
                ))}

            </div>

        </div>
    );
};

export default MyNewsPage;