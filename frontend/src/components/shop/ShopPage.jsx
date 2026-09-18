import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:8000';

const ShopPage = () => {
    const navigate = useNavigate();

    const [items, setItems] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [coins, setCoins] = useState(0);

    const [loading, setLoading] = useState(true);
    const [buyingItemId, setBuyingItemId] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');



    const loadShop = async () => {
        try {
            setLoading(true);
            setError('');

            const token =
                localStorage.getItem('access_token');

            const response = await fetch(
                `${API_URL}/shop`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.detail ||
                    'Не удалось загрузить магазин'
                );
            }

            setCoins(data.coins ?? 0);
            setItems(data.items || []);
            setInventory(data.inventory || []);

        } catch (err) {
            console.error(
                '[SHOP] Load error:',
                err
            );

            setError(
                err.message ||
                'Не удалось загрузить магазин'
            );

        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        loadShop();
    }, []);


    const getInventoryQuantity = (itemId) => {
        const inventoryItem = inventory.find(
            entry =>
                entry.item?.id === itemId
        );

        return inventoryItem?.quantity || 0;
    };



    const handleBuy = async (item) => {
        try {
            setError('');
            setSuccess('');
            setBuyingItemId(item.id);

            const token =
                localStorage.getItem('access_token');

            const response = await fetch(
                `${API_URL}/shop/buy`,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },

                    body: JSON.stringify({
                        item_id: item.id
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.detail ||
                    'Не удалось купить предмет'
                );
            }

            setCoins(data.coins ?? 0);

            setSuccess(
                `Предмет «${item.name}» куплен!`
            );

            await loadShop();

        } catch (err) {
            console.error(
                '[SHOP] Buy error:',
                err
            );

            setError(
                err.message ||
                'Не удалось купить предмет'
            );

        } finally {
            setBuyingItemId(null);
        }
    };

  

    if (loading) {
        return (
            <div className="container mt-4">

                <div className="text-center mt-5">
                    <div
                        className="spinner-border"
                        role="status"
                    />

                    <div className="mt-3">
                        Загрузка магазина...
                    </div>
                </div>

            </div>
        );
    }


    return (
        <div className="container mt-4">

            

            <div className="d-flex justify-content-between align-items-center mb-4">

                <div>
                    <h2>
                        🛒 Магазин
                    </h2>

                    <p className="text-muted mb-0">
                        Покупайте предметы и используйте
                        их против соперников во время игры
                    </p>
                </div>

                <div className="d-flex gap-2">

                    <div className="badge bg-warning text-dark d-flex align-items-center px-3 fs-5">
                        🪙 {coins}
                    </div>

                    <button
                        className="btn btn-secondary"
                        onClick={() => navigate('/')}
                    >
                        Назад
                    </button>

                </div>

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

            {success && (
                <div
                    className="alert alert-success alert-dismissible"
                    role="alert"
                >
                    {success}

                    <button
                        type="button"
                        className="btn-close"
                        onClick={() => setSuccess('')}
                    />
                </div>
            )}

          

            {items.length === 0 ? (

                <div className="card shadow-sm">
                    <div className="card-body text-center p-5">

                        <div
                            style={{
                                fontSize: '60px'
                            }}
                        >
                            🛒
                        </div>

                        <h4 className="mt-3">
                            Магазин пуст
                        </h4>

                        <p className="text-muted mb-0">
                            Пока нет доступных предметов.
                        </p>

                    </div>
                </div>

            ) : (

                <div className="row">

                    {items.map((item) => {

                        const quantity =
                            getInventoryQuantity(item.id);

                        const canBuy =
                            coins >= item.price;

                        const isBuying =
                            buyingItemId === item.id;

                        return (
                            <div
                                className="col-md-6 col-lg-4 mb-4"
                                key={item.id}
                            >

                                <div className="card h-100 shadow-sm">

                                    <div className="card-body d-flex flex-column">

                                      

                                        <div className="text-center mb-3">

                                            <div
                                                style={{
                                                    fontSize: '72px',
                                                    lineHeight: '1.2'
                                                }}
                                            >
                                                {item.name?.match(
                                                    /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u
                                                )?.[0] || '🎁'}
                                            </div>

                                            <h4 className="mt-2 mb-0">
                                                {item.name}
                                            </h4>

                                        </div>

                                       

                                        <p className="text-muted text-center">
                                            {item.description ||
                                                'Игровой предмет'}
                                        </p>

                                        

                                        <div className="mt-auto">

                                            <div className="d-flex justify-content-between align-items-center mb-3">

                                                <span className="badge bg-warning text-dark fs-6">
                                                    🪙 {item.price}
                                                </span>

                                                <span className="badge bg-secondary fs-6">
                                                    🎒 {quantity}
                                                </span>

                                            </div>

                                           

                                            <button
                                                className="btn btn-primary w-100"
                                                onClick={() =>
                                                    handleBuy(item)
                                                }
                                                disabled={
                                                    isBuying ||
                                                    !canBuy
                                                }
                                            >
                                                {isBuying
                                                    ? 'Покупка...'
                                                    : canBuy
                                                        ? 'Купить'
                                                        : 'Недостаточно монет'
                                                }
                                            </button>

                                        </div>

                                    </div>

                                </div>

                            </div>
                        );
                    })}

                </div>

            )}


            <div className="card shadow-sm mt-2 mb-5">

                <div className="card-header">
                    <h4 className="mb-0">
                        🎒 Мой инвентарь
                    </h4>
                </div>

                <div className="card-body">

                    {inventory.length === 0 ? (

                        <div className="text-center text-muted py-4">

                            <div
                                style={{
                                    fontSize: '45px'
                                }}
                            >
                                🎒
                            </div>

                            <div className="mt-2">
                                Инвентарь пуст
                            </div>

                            <small>
                                Купите предметы выше,
                                чтобы они появились здесь.
                            </small>

                        </div>

                    ) : (

                        <div className="row">

                            {inventory.map((entry) => (

                                <div
                                    className="col-md-6 col-lg-4 mb-3"
                                    key={entry.item?.id}
                                >

                                    <div className="border rounded p-3">

                                        <div className="d-flex justify-content-between align-items-center">

                                            <div>
                                                <strong>
                                                    {entry.item?.name}
                                                </strong>

                                                <div className="text-muted small">
                                                    {entry.item?.description}
                                                </div>
                                            </div>

                                            <span className="badge bg-primary fs-6">
                                                ×{entry.quantity}
                                            </span>

                                        </div>

                                    </div>

                                </div>

                            ))}

                        </div>

                    )}

                </div>

            </div>

        </div>
    );
};

export default ShopPage;