import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createNews } from '../../services/newsService';

const NewsCreatePage = () => {
    const navigate = useNavigate();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [imageUrl, setImageUrl] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError('');
        setSuccess('');

        if (!title.trim()) {
            setError('Введите заголовок новости');
            return;
        }

        if (!content.trim()) {
            setError('Введите текст новости');
            return;
        }

        try {
            setLoading(true);

            await createNews({
                title: title.trim(),
                content: content.trim(),
                image_url: imageUrl.trim() || null
            });

            setSuccess(
                'Новость отправлена на модерацию. После проверки администратора она может быть опубликована.'
            );

            setTitle('');
            setContent('');
            setImageUrl('');
        } catch (err) {
            console.error(
                'Ошибка создания новости:',
                err
            );

            setError(
                err.response?.data?.detail ||
                'Не удалось отправить новость'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-4">

            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h1>💡 Предложить новость</h1>

                    <p className="text-muted mb-0">
                        Предложите интересную новость для публикации
                    </p>
                </div>

                <button
                    className="btn btn-outline-secondary"
                    onClick={() => navigate('/')}
                >
                    ← Новости
                </button>
            </div>

            <div className="row justify-content-center">

                <div className="col-lg-8">

                    <div className="card shadow-sm">

                        <div className="card-body p-4">

                       
                            {success && (
                                <div
                                    className="alert alert-success"
                                    role="alert"
                                >
                                    <h5 className="alert-heading">
                                        ✅ Новость отправлена
                                    </h5>

                                    <p className="mb-3">
                                        {success}
                                    </p>

                                    <button
                                        className="btn btn-success"
                                        onClick={() =>
                                            navigate('/news/my')
                                        }
                                    >
                                        Посмотреть мои новости
                                    </button>
                                </div>
                            )}

                          
                            {error && (
                                <div
                                    className="alert alert-danger"
                                    role="alert"
                                >
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>

                              
                                <div className="mb-3">

                                    <label
                                        htmlFor="news-title"
                                        className="form-label fw-bold"
                                    >
                                        Заголовок
                                    </label>

                                    <input
                                        id="news-title"
                                        type="text"
                                        className="form-control"
                                        value={title}
                                        onChange={(event) =>
                                            setTitle(
                                                event.target.value
                                            )
                                        }
                                        placeholder="Введите заголовок новости"
                                        maxLength={200}
                                        disabled={loading}
                                    />

                                    <div className="form-text">
                                        От 3 до 200 символов.
                                    </div>

                                </div>

                                
                                <div className="mb-3">

                                    <label
                                        htmlFor="news-content"
                                        className="form-label fw-bold"
                                    >
                                        Текст новости
                                    </label>

                                    <textarea
                                        id="news-content"
                                        className="form-control"
                                        rows="10"
                                        value={content}
                                        onChange={(event) =>
                                            setContent(
                                                event.target.value
                                            )
                                        }
                                        placeholder="Напишите текст новости..."
                                        disabled={loading}
                                    />

                                    <div className="form-text">
                                        Опишите событие, обновление или
                                        другую информацию, которую стоит
                                        разместить на сайте.
                                    </div>

                                </div>

                                
                                <div className="mb-4">

                                    <label
                                        htmlFor="news-image"
                                        className="form-label fw-bold"
                                    >
                                        Изображение
                                        <span className="text-muted fw-normal">
                                            {' '}
                                            (необязательно)
                                        </span>
                                    </label>

                                    <input
                                        id="news-image"
                                        type="url"
                                        className="form-control"
                                        value={imageUrl}
                                        onChange={(event) =>
                                            setImageUrl(
                                                event.target.value
                                            )
                                        }
                                        placeholder="https://example.com/image.jpg"
                                        maxLength={500}
                                        disabled={loading}
                                    />

                                    <div className="form-text">
                                        Пока можно указать ссылку на
                                        изображение. Загрузку файлов
                                        добавим позже.
                                    </div>

                                </div>

                            
                                <div className="d-flex gap-2">

                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <span
                                                    className="spinner-border spinner-border-sm me-2"
                                                    role="status"
                                                />
                                                Отправка...
                                            </>
                                        ) : (
                                            '📤 Отправить на модерацию'
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={() =>
                                            navigate('/news/my')
                                        }
                                        disabled={loading}
                                    >
                                        Мои новости
                                    </button>

                                </div>

                            </form>

                        </div>

                    </div>

                  
                    <div className="alert alert-info mt-4">

                        <h5>ℹ️ Как это работает?</h5>

                        <ol className="mb-0">
                            <li>
                                Вы отправляете новость.
                            </li>
                            <li>
                                Новость получает статус
                                <strong> «На модерации»</strong>.
                            </li>
                            <li>
                                Администратор проверяет её.
                            </li>
                            <li>
                                Если новость интересная —
                                она публикуется.
                            </li>
                            <li>
                                Если новость отклонена, вы увидите
                                причину в разделе «Мои новости».
                            </li>
                        </ol>

                    </div>

                </div>

            </div>

        </div>
    );
};

export default NewsCreatePage;