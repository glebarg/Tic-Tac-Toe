import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getAdminNews,
    publishNews,
    rejectNews,
    updateNews,
    deleteNews
} from '../../services/newsService';

const AdminNewsPage = () => {
    const navigate = useNavigate();

    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [filter, setFilter] = useState('all');

    const [actionLoading, setActionLoading] = useState(null);

    const [editingNews, setEditingNews] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');
    const [editImageUrl, setEditImageUrl] = useState('');

    const [rejectingNews, setRejectingNews] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    const loadNews = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await getAdminNews();

            setNews(response.data);
        } catch (err) {
            console.error(
                'Ошибка загрузки админских новостей:',
                err
            );

            if (err.response?.status === 403) {
                setError(
                    'У вас нет прав администратора.'
                );
            } else {
                setError(
                    err.response?.data?.detail ||
                    'Не удалось загрузить новости'
                );
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
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

    const filteredNews = news.filter((item) => {
        if (filter === 'all') {
            return true;
        }

        return item.status === filter;
    });

    const pendingCount = news.filter(
        (item) => item.status === 'pending'
    ).length;

    const publishedCount = news.filter(
        (item) => item.status === 'published'
    ).length;

    const rejectedCount = news.filter(
        (item) => item.status === 'rejected'
    ).length;


    const handlePublish = async (item) => {
        const confirmed = window.confirm(
            `Опубликовать новость "${item.title}"?`
        );

        if (!confirmed) {
            return;
        }

        try {
            setActionLoading(item.id);
            setError('');

            await publishNews(item.id);

            await loadNews();
        } catch (err) {
            console.error(
                'Ошибка публикации новости:',
                err
            );

            setError(
                err.response?.data?.detail ||
                'Не удалось опубликовать новость'
            );
        } finally {
            setActionLoading(null);
        }
    };


    const openRejectModal = (item) => {
        setRejectingNews(item);
        setRejectReason('');
    };

    const closeRejectModal = () => {
        setRejectingNews(null);
        setRejectReason('');
    };

    const handleReject = async () => {
        if (!rejectingNews) {
            return;
        }

        try {
            setActionLoading(rejectingNews.id);
            setError('');

            await rejectNews(
                rejectingNews.id,
                rejectReason.trim()
            );

            closeRejectModal();

            await loadNews();
        } catch (err) {
            console.error(
                'Ошибка отклонения новости:',
                err
            );

            setError(
                err.response?.data?.detail ||
                'Не удалось отклонить новость'
            );
        } finally {
            setActionLoading(null);
        }
    };


    const openEditModal = (item) => {
        setEditingNews(item);

        setEditTitle(item.title || '');
        setEditContent(item.content || '');
        setEditImageUrl(item.image_url || '');
    };

    const closeEditModal = () => {
        setEditingNews(null);
        setEditTitle('');
        setEditContent('');
        setEditImageUrl('');
    };

    const handleUpdate = async (event) => {
        event.preventDefault();

        if (!editingNews) {
            return;
        }

        if (!editTitle.trim()) {
            setError('Введите заголовок новости');
            return;
        }

        if (!editContent.trim()) {
            setError('Введите текст новости');
            return;
        }

        try {
            setActionLoading(editingNews.id);
            setError('');

            await updateNews(editingNews.id, {
                title: editTitle.trim(),
                content: editContent.trim(),
                image_url: editImageUrl.trim() || null
            });

            closeEditModal();

            await loadNews();
        } catch (err) {
            console.error(
                'Ошибка редактирования новости:',
                err
            );

            setError(
                err.response?.data?.detail ||
                'Не удалось изменить новость'
            );
        } finally {
            setActionLoading(null);
        }
    };


    const handleDelete = async (item) => {
        const confirmed = window.confirm(
            `Удалить новость "${item.title}"?\n\nНовость будет скрыта с сайта.`
        );

        if (!confirmed) {
            return;
        }

        try {
            setActionLoading(item.id);
            setError('');

            await deleteNews(item.id);

            await loadNews();
        } catch (err) {
            console.error(
                'Ошибка удаления новости:',
                err
            );

            setError(
                err.response?.data?.detail ||
                'Не удалось удалить новость'
            );
        } finally {
            setActionLoading(null);
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
                    Загружаем панель администратора...
                </p>

            </div>
        );
    }

    return (
        <div className="container mt-4">

            <div className="d-flex justify-content-between align-items-center mb-4">

                <div>
                    <h1>🛠 Панель администратора</h1>

                    <p className="text-muted mb-0">
                        Управление новостями и модерация предложений
                    </p>
                </div>

                <button
                    className="btn btn-outline-secondary"
                    onClick={() => navigate('/')}
                >
                    ← Новости
                </button>

            </div>

           
            {error && (
                <div
                    className="alert alert-danger alert-dismissible"
                    role="alert"
                >
                    {error}

                    <button
                        type="button"
                        className="btn-close"
                        onClick={() => setError('')}
                    />
                </div>
            )}

            <div className="row mb-4">

                <div className="col-md-3 mb-3">
                    <div
                        className={`card shadow-sm h-100 ${
                            filter === 'all'
                                ? 'border-primary'
                                : ''
                        }`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setFilter('all')}
                    >
                        <div className="card-body text-center">

                            <div className="fs-2 fw-bold">
                                {news.length}
                            </div>

                            <div className="text-muted">
                                📰 Всего
                            </div>

                        </div>
                    </div>
                </div>

                <div className="col-md-3 mb-3">
                    <div
                        className={`card shadow-sm h-100 ${
                            filter === 'pending'
                                ? 'border-warning'
                                : ''
                        }`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setFilter('pending')}
                    >
                        <div className="card-body text-center">

                            <div className="fs-2 fw-bold text-warning">
                                {pendingCount}
                            </div>

                            <div className="text-muted">
                                🟡 На модерации
                            </div>

                        </div>
                    </div>
                </div>

                <div className="col-md-3 mb-3">
                    <div
                        className={`card shadow-sm h-100 ${
                            filter === 'published'
                                ? 'border-success'
                                : ''
                        }`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setFilter('published')}
                    >
                        <div className="card-body text-center">

                            <div className="fs-2 fw-bold text-success">
                                {publishedCount}
                            </div>

                            <div className="text-muted">
                                🟢 Опубликовано
                            </div>

                        </div>
                    </div>
                </div>

                <div className="col-md-3 mb-3">
                    <div
                        className={`card shadow-sm h-100 ${
                            filter === 'rejected'
                                ? 'border-danger'
                                : ''
                        }`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setFilter('rejected')}
                    >
                        <div className="card-body text-center">

                            <div className="fs-2 fw-bold text-danger">
                                {rejectedCount}
                            </div>

                            <div className="text-muted">
                                🔴 Отклонено
                            </div>

                        </div>
                    </div>
                </div>

            </div>

           
            <div className="card shadow-sm mb-4">

                <div className="card-body">

                    <div className="d-flex justify-content-between align-items-center">

                        <div>
                            <strong>
                                Новости
                            </strong>

                            <span className="text-muted ms-2">
                                ({filteredNews.length})
                            </span>
                        </div>

                        <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={loadNews}
                        >
                            🔄 Обновить
                        </button>

                    </div>

                </div>

            </div>

           
            {filteredNews.length === 0 ? (
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
                            Новостей нет
                        </h3>

                        <p className="text-muted mb-0">
                            В выбранной категории пока ничего нет.
                        </p>

                    </div>

                </div>
            ) : (
                filteredNews.map((item) => (
                    <div
                        className="card shadow-sm mb-4"
                        key={item.id}
                    >

                        <div className="card-body p-4">

                            <div className="d-flex justify-content-between align-items-start">

                                <div className="flex-grow-1">

                                    <div className="d-flex align-items-center gap-2 mb-2">

                                        <h3 className="mb-0">
                                            {item.title}
                                        </h3>

                                        {getStatusBadge(
                                            item.status
                                        )}

                                    </div>

                                    <div className="text-muted small mb-3">

                                        Автор:{' '}
                                        <strong>
                                            {item.author?.username ||
                                                'Неизвестно'}
                                        </strong>

                                        {' • '}

                                        Создано:{' '}
                                        {new Date(
                                            item.created_at
                                        ).toLocaleString()}

                                    </div>

                                </div>

                            </div>

                            {item.image_url && (
                                <img
                                    src={item.image_url}
                                    alt={item.title}
                                    className="img-fluid rounded mb-3"
                                    style={{
                                        maxHeight: '300px',
                                        width: '100%',
                                        objectFit: 'cover'
                                    }}
                                />
                            )}

                            <p
                                style={{
                                    whiteSpace: 'pre-wrap'
                                }}
                            >
                                {item.content.length > 600
                                    ? `${item.content.slice(
                                          0,
                                          600
                                      )}...`
                                    : item.content}
                            </p>

                          
                            {item.status === 'rejected' &&
                                item.rejection_reason && (
                                    <div className="alert alert-danger">

                                        <strong>
                                            Причина отклонения:
                                        </strong>

                                        <div className="mt-1">
                                            {item.rejection_reason}
                                        </div>

                                    </div>
                                )}

                            
                            {item.status === 'published' &&
                                item.published_at && (
                                    <div className="text-muted small mb-3">
                                        Опубликовано:{' '}
                                        {new Date(
                                            item.published_at
                                        ).toLocaleString()}
                                    </div>
                                )}

                            <hr />

                           
                            <div className="d-flex flex-wrap gap-2">

                                {item.status === 'published' && (
                                    <button
                                        className="btn btn-outline-primary"
                                        onClick={() =>
                                            navigate(
                                                `/news/${item.id}`
                                            )
                                        }
                                    >
                                        👁 Открыть
                                    </button>
                                )}

                                <button
                                    className="btn btn-outline-secondary"
                                    onClick={() =>
                                        openEditModal(item)
                                    }
                                    disabled={
                                        actionLoading === item.id
                                    }
                                >
                                    ✏️ Редактировать
                                </button>

                                {item.status !== 'published' && (
                                    <button
                                        className="btn btn-success"
                                        onClick={() =>
                                            handlePublish(item)
                                        }
                                        disabled={
                                            actionLoading === item.id
                                        }
                                    >
                                        {actionLoading === item.id ? (
                                            <>
                                                <span
                                                    className="spinner-border spinner-border-sm me-2"
                                                    role="status"
                                                />
                                                Обработка...
                                            </>
                                        ) : (
                                            '✅ Опубликовать'
                                        )}
                                    </button>
                                )}

                                {item.status !== 'rejected' && (
                                    <button
                                        className="btn btn-warning"
                                        onClick={() =>
                                            openRejectModal(item)
                                        }
                                        disabled={
                                            actionLoading === item.id
                                        }
                                    >
                                        ❌ Отклонить
                                    </button>
                                )}

                                <button
                                    className="btn btn-outline-danger"
                                    onClick={() =>
                                        handleDelete(item)
                                    }
                                    disabled={
                                        actionLoading === item.id
                                    }
                                >
                                    🗑 Удалить
                                </button>

                            </div>

                        </div>

                    </div>
                ))
            )}

           

            {editingNews && (
                <div
                    className="modal d-block"
                    tabIndex="-1"
                    style={{
                        backgroundColor:
                            'rgba(0, 0, 0, 0.5)'
                    }}
                >
                    <div className="modal-dialog modal-lg modal-dialog-centered">

                        <div className="modal-content">

                            <div className="modal-header">

                                <h5 className="modal-title">
                                    ✏️ Редактирование новости
                                </h5>

                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={closeEditModal}
                                />

                            </div>

                            <form onSubmit={handleUpdate}>

                                <div className="modal-body">

                                    <div className="mb-3">

                                        <label
                                            className="form-label fw-bold"
                                            htmlFor="edit-news-title"
                                        >
                                            Заголовок
                                        </label>

                                        <input
                                            id="edit-news-title"
                                            type="text"
                                            className="form-control"
                                            value={editTitle}
                                            onChange={(event) =>
                                                setEditTitle(
                                                    event.target.value
                                                )
                                            }
                                            maxLength={200}
                                            disabled={
                                                actionLoading ===
                                                editingNews.id
                                            }
                                        />

                                    </div>

                                    <div className="mb-3">

                                        <label
                                            className="form-label fw-bold"
                                            htmlFor="edit-news-content"
                                        >
                                            Текст
                                        </label>

                                        <textarea
                                            id="edit-news-content"
                                            className="form-control"
                                            rows="10"
                                            value={editContent}
                                            onChange={(event) =>
                                                setEditContent(
                                                    event.target.value
                                                )
                                            }
                                            disabled={
                                                actionLoading ===
                                                editingNews.id
                                            }
                                        />

                                    </div>

                                    <div className="mb-3">

                                        <label
                                            className="form-label fw-bold"
                                            htmlFor="edit-news-image"
                                        >
                                            Изображение
                                        </label>

                                        <input
                                            id="edit-news-image"
                                            type="url"
                                            className="form-control"
                                            value={editImageUrl}
                                            onChange={(event) =>
                                                setEditImageUrl(
                                                    event.target.value
                                                )
                                            }
                                            maxLength={500}
                                            placeholder="https://example.com/image.jpg"
                                            disabled={
                                                actionLoading ===
                                                editingNews.id
                                            }
                                        />

                                    </div>

                                </div>

                                <div className="modal-footer">

                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={closeEditModal}
                                        disabled={
                                            actionLoading ===
                                            editingNews.id
                                        }
                                    >
                                        Отмена
                                    </button>

                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={
                                            actionLoading ===
                                            editingNews.id
                                        }
                                    >
                                        {actionLoading ===
                                        editingNews.id ? (
                                            <>
                                                <span
                                                    className="spinner-border spinner-border-sm me-2"
                                                    role="status"
                                                />
                                                Сохранение...
                                            </>
                                        ) : (
                                            '💾 Сохранить'
                                        )}
                                    </button>

                                </div>

                            </form>

                        </div>

                    </div>
                </div>
            )}


            {rejectingNews && (
                <div
                    className="modal d-block"
                    tabIndex="-1"
                    style={{
                        backgroundColor:
                            'rgba(0, 0, 0, 0.5)'
                    }}
                >
                    <div className="modal-dialog modal-dialog-centered">

                        <div className="modal-content">

                            <div className="modal-header">

                                <h5 className="modal-title">
                                    ❌ Отклонить новость
                                </h5>

                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={closeRejectModal}
                                />

                            </div>

                            <div className="modal-body">

                                <p>
                                    Вы отклоняете новость:
                                </p>

                                <div className="alert alert-light border">
                                    <strong>
                                        {rejectingNews.title}
                                    </strong>
                                </div>

                                <label
                                    htmlFor="reject-reason"
                                    className="form-label fw-bold"
                                >
                                    Причина отклонения
                                </label>

                                <textarea
                                    id="reject-reason"
                                    className="form-control"
                                    rows="5"
                                    value={rejectReason}
                                    onChange={(event) =>
                                        setRejectReason(
                                            event.target.value
                                        )
                                    }
                                    maxLength={1000}
                                    placeholder="Например: новость не соответствует тематике сайта..."
                                    disabled={
                                        actionLoading ===
                                        rejectingNews.id
                                    }
                                />

                                <div className="form-text">
                                    Причина будет видна автору новости.
                                </div>

                            </div>

                            <div className="modal-footer">

                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={closeRejectModal}
                                    disabled={
                                        actionLoading ===
                                        rejectingNews.id
                                    }
                                >
                                    Отмена
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={handleReject}
                                    disabled={
                                        actionLoading ===
                                        rejectingNews.id
                                    }
                                >
                                    {actionLoading ===
                                    rejectingNews.id ? (
                                        <>
                                            <span
                                                className="spinner-border spinner-border-sm me-2"
                                                role="status"
                                            />
                                            Отклонение...
                                        </>
                                    ) : (
                                        '❌ Отклонить'
                                    )}
                                </button>

                            </div>

                        </div>

                    </div>
                </div>
            )}

        </div>
    );
};

export default AdminNewsPage;