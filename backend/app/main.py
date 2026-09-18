from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from . import models, schemas, auth
from .database import SessionLocal, engine
from jose import jwt, JWTError
from fastapi.security import OAuth2PasswordBearer
from datetime import datetime
from typing import List
from sqlalchemy import text, or_, and_

models.Base.metadata.create_all(bind=engine)

def migrate_database():
    with engine.begin() as connection:

        connection.execute(
            text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS
                role VARCHAR(20)
                NOT NULL
                DEFAULT 'user'
            """)
        )


        connection.execute(
            text("""
                ALTER TABLE ranked_matches
                ADD COLUMN IF NOT EXISTS
                finished_at TIMESTAMP
            """)
        )

        connection.execute(
            text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS
                coins INTEGER
                NOT NULL
                DEFAULT 0
            """)
        )

def ensure_shop_items(db: Session):
    default_items = [
        {
            "name": "🥚 Яйцо",
            "description": "Бросить яйцо в соперника",
            "price": 2,
            "effect_type": "cosmetic",
            "animation": "egg"
        },
        {
            "name": "🍅 Помидор",
            "description": "Запустить помидор в соперника",
            "price": 3,
            "effect_type": "cosmetic",
            "animation": "tomato"
        },
        {
            "name": "💩 Какашка",
            "description": "Самый неприятный подарок",
            "price": 5,
            "effect_type": "cosmetic",
            "animation": "poop"
        }
    ]

    changed = False

    for item_data in default_items:
        existing = (
            db.query(models.ShopItem)
            .filter(
                models.ShopItem.name == item_data["name"]
            )
            .first()
        )

        if not existing:
            db.add(
                models.ShopItem(**item_data)
            )
            changed = True

    if changed:
        db.commit()

migrate_database()

db_init = SessionLocal()
try:
    ensure_shop_items(db_init)
finally:
    db_init.close()
app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")


def get_current_user_dep(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Невалидный токен")
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
        return user
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Ошибка проверки токена")

def get_current_admin(
    current_user: models.User = Depends(
        get_current_user_dep
    )
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав"
        )

    return current_user

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, set[WebSocket]] = {}
        self.lobby_connections: set[WebSocket] = set()

    async def connect(self, game_id: int, websocket: WebSocket):
        await websocket.accept()

        connections = self.active_connections.setdefault(game_id, set())
        connections.add(websocket)

        print(
            f"[WS] User connected to game {game_id}. "
            f"Connections: {len(connections)}"
        )

    def disconnect(self, game_id: int, websocket: WebSocket):
        connections = self.active_connections.get(game_id)

        if not connections:
            return

        connections.discard(websocket)

        if not connections:
            del self.active_connections[game_id]

        print(
            f"[WS] User disconnected from game {game_id}. "
            f"Connections: {len(connections) if connections else 0}"
        )

    async def broadcast(self, game_id: int, data: dict):
        connections = list(
            self.active_connections.get(game_id, set())
        )

        if not connections:
            print(f"[WS] No connections for game {game_id}")
            return

        print(
            f"[WS] Broadcasting update to game {game_id}. "
            f"Connections: {len(connections)}"
        )

        disconnected = []

        for websocket in connections:
            try:
                await websocket.send_json(data)
            except Exception as e:
                print(f"[WS] Failed to send message: {e}")
                disconnected.append(websocket)

        for websocket in disconnected:
            self.disconnect(game_id, websocket)

    async def connect_lobby(self, websocket: WebSocket):
        await websocket.accept()

        self.lobby_connections.add(websocket)

        print(
            f"[WS] User connected to lobby. "
            f"Connections: {len(self.lobby_connections)}"
        )

    def disconnect_lobby(self, websocket: WebSocket):
        self.lobby_connections.discard(websocket)

        print(
            f"[WS] User disconnected from lobby. "
            f"Connections: {len(self.lobby_connections)}"
        )

    async def broadcast_lobby(self, data: dict):
        connections = list(self.lobby_connections)

        if not connections:
            print("[WS] No lobby connections")
            return

        print(
            f"[WS] Broadcasting lobby update. "
            f"Connections: {len(connections)}"
        )

        disconnected = []

        for websocket in connections:
            try:
                await websocket.send_json(data)
            except Exception as e:
                print(f"[WS] Failed to send lobby message: {e}")
                disconnected.append(websocket)

        for websocket in disconnected:
            self.disconnect_lobby(websocket)
manager = ConnectionManager()


RANKED_BOARD_SIZES = [3, 4, 5, 6, 7, 8, 9, 10]

DEFAULT_RATING = 1000


ELO_K = 32



ranked_queues: dict[int, list[int]] = {
    board_size: []
    for board_size in RANKED_BOARD_SIZES
}



ranked_connections: dict[int, WebSocket] = {}


def ensure_player_ratings(
    db: Session,
    user_id: int
):
    existing_ratings = (
        db.query(models.PlayerRating)
        .filter(
            models.PlayerRating.user_id == user_id
        )
        .all()
    )

    existing_sizes = {
        rating.board_size
        for rating in existing_ratings
    }

    created = False

    for board_size in RANKED_BOARD_SIZES:
        if board_size not in existing_sizes:
            rating = models.PlayerRating(
                user_id=user_id,
                board_size=board_size,
                rating=DEFAULT_RATING,
                wins=0,
                losses=0,
                draws=0,
                games_played=0
            )

            db.add(rating)
            created = True

    if created:
        db.commit()

def get_player_rating(
    db: Session,
    user_id: int,
    board_size: int
):
    rating = (
        db.query(models.PlayerRating)
        .filter(
            models.PlayerRating.user_id == user_id,
            models.PlayerRating.board_size == board_size
        )
        .first()
    )

    if not rating:
        ensure_player_ratings(db, user_id)

        rating = (
            db.query(models.PlayerRating)
            .filter(
                models.PlayerRating.user_id == user_id,
                models.PlayerRating.board_size == board_size
            )
            .first()
        )

    return rating



def calculate_expected_score(
    player_rating: int,
    opponent_rating: int
):
    return 1 / (
        1 + 10 ** (
            (opponent_rating - player_rating) / 400
        )
    )



def calculate_new_rating(
    player_rating: int,
    opponent_rating: int,
    result: float
):
    expected = calculate_expected_score(
        player_rating,
        opponent_rating
    )

    new_rating = round(
        player_rating
        + ELO_K * (result - expected)
    )

    return max(0, new_rating)

@app.post("/register", response_model=schemas.Token)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email уже зарегистрирован")
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(username=user.username, email=user.email, password_hash=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    ensure_player_ratings(
    db,
    db_user.id
)

    return auth.create_tokens({
        "sub": user.email
})


@app.post("/login", response_model=schemas.Token)
def login(
    user: schemas.UserLogin,
    db: Session = Depends(get_db)
):
    db_user = (
        db.query(models.User)
        .filter(models.User.email == user.email)
        .first()
    )

    if (
        not db_user
        or not auth.verify_password(
            user.password,
            db_user.password_hash
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль"
        )
    ensure_player_ratings(
        db,
        db_user.id
    )

    return auth.create_tokens({
        "sub": user.email
    })

@app.get(
    "/coins",
    response_model=schemas.CoinBalanceResponse
)
def get_coins(
    current_user: models.User = Depends(
        get_current_user_dep
    )
):
    return {
        "coins": current_user.coins
    }

@app.get(
    "/ranked/ratings",
    response_model=List[schemas.PlayerRatingResponse]
)
def get_my_ratings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_dep)
):
    ensure_player_ratings(
        db,
        current_user.id
    )

    ratings = (
        db.query(models.PlayerRating)
        .filter(
            models.PlayerRating.user_id == current_user.id
        )
        .order_by(
            models.PlayerRating.board_size
        )
        .all()
    )

    return ratings

@app.get(
    "/shop",
    response_model=schemas.ShopResponse
)
def get_shop(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user_dep
    )
):
    items = (
        db.query(models.ShopItem)
        .filter(
            models.ShopItem.is_active == True
        )
        .order_by(
            models.ShopItem.price.asc()
        )
        .all()
    )

    inventory_rows = (
        db.query(models.UserItem)
        .options(
            joinedload(models.UserItem.item)
        )
        .filter(
            models.UserItem.user_id == current_user.id,
            models.UserItem.quantity > 0
        )
        .all()
    )

    inventory = [
        {
            "item": row.item,
            "quantity": row.quantity
        }
        for row in inventory_rows
    ]

    return {
        "coins": current_user.coins,
        "items": items,
        "inventory": inventory
    }


@app.post("/shop/buy")
def buy_item(
    data: schemas.BuyItemRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user_dep
    )
):
    item = (
        db.query(models.ShopItem)
        .filter(
            models.ShopItem.id == data.item_id,
            models.ShopItem.is_active == True
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Предмет не найден"
        )

    if current_user.coins < item.price:
        raise HTTPException(
            status_code=400,
            detail="Недостаточно монет"
        )

    current_user.coins -= item.price

    inventory_item = (
        db.query(models.UserItem)
        .filter(
            models.UserItem.user_id == current_user.id,
            models.UserItem.item_id == item.id
        )
        .first()
    )

    if inventory_item:
        inventory_item.quantity += 1
    else:
        inventory_item = models.UserItem(
            user_id=current_user.id,
            item_id=item.id,
            quantity=1
        )

        db.add(inventory_item)

    db.add(
        models.CoinTransaction(
            user_id=current_user.id,
            amount=-item.price,
            reason=f"shop_purchase:{item.id}"
        )
    )

    db.commit()

    return {
        "success": True,
        "coins": current_user.coins,
        "item_id": item.id
    }

@app.post("/games/{game_id}/item")
async def use_game_item(
    game_id: int,
    data: schemas.UseItemRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user_dep
    )
):
    game = (
        db.query(models.Game)
        .filter(
            models.Game.id == game_id
        )
        .first()
    )

    if not game:
        raise HTTPException(
            status_code=404,
            detail="Игра не найдена"
        )

    if game.status != "in_progress":
        raise HTTPException(
            status_code=400,
            detail="Игра уже закончена"
        )

    if current_user.id not in (
        game.player_x_id,
        game.player_o_id
    ):
        raise HTTPException(
            status_code=403,
            detail="Вы не участвуете в этой игре"
        )


    if current_user.id == game.player_x_id:
        target_user_id = game.player_o_id
    else:
        target_user_id = game.player_x_id

    if target_user_id is None:
        raise HTTPException(
            status_code=400,
            detail="У игры пока нет соперника"
        )


    item = (
        db.query(models.ShopItem)
        .filter(
            models.ShopItem.id == data.item_id,
            models.ShopItem.is_active == True
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Предмет не найден"
        )



    inventory_item = (
        db.query(models.UserItem)
        .filter(
            models.UserItem.user_id == current_user.id,
            models.UserItem.item_id == item.id
        )
        .first()
    )

    if not inventory_item or inventory_item.quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="У вас нет этого предмета"
        )
    inventory_item.quantity -= 1


    usage = models.GameItemUse(
        game_id=game.id,
        item_id=item.id,
        from_user_id=current_user.id,
        target_user_id=target_user_id
    )

    db.add(usage)

    db.commit()
    await manager.broadcast(
        game_id,
        {
            "type": "game_item",
            "item": item.animation,
            "item_id": item.id,
            "from_user_id": current_user.id,
            "from_username": current_user.username,
            "target_user_id": target_user_id
        }
    )

    print(
        f"[ITEM] User {current_user.username} "
        f"used {item.name} in game {game.id}"
    )

    return {
        "success": True,
        "item": item.animation,
        "quantity": inventory_item.quantity
    }

@app.post("/refresh", response_model=schemas.Token)
def refresh_token(body: schemas.RefreshToken):
    token = body.refresh_token
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Невалидный токен")
        return auth.create_tokens({"sub": email})
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Невалидный токен")


@app.get("/me")
def get_current_user(current_user: models.User = Depends(get_current_user_dep)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "created_at": current_user.created_at,
        "role": current_user.role
    }

@app.get(
    "/profile/stats",
    response_model=schemas.ProfileStatsResponse
)
def get_profile_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_dep)
):

    normal_games = (
        db.query(models.Game)
        .filter(
            models.Game.game_type != "ranked",
            (
                (models.Game.player_x_id == current_user.id)
                |
                (models.Game.player_o_id == current_user.id)
            ),
            models.Game.status == "finished"
        )
        .all()
    )

    normal_wins = 0
    normal_losses = 0
    normal_draws = 0

    for game in normal_games:

       
        if game.winner_id is None:
            normal_draws += 1

       
        elif game.winner_id == current_user.id:
            normal_wins += 1

       
        else:
            normal_losses += 1




    ensure_player_ratings(
        db,
        current_user.id
    )

    ratings = (
        db.query(models.PlayerRating)
        .filter(
            models.PlayerRating.user_id == current_user.id
        )
        .order_by(
            models.PlayerRating.board_size
        )
        .all()
    )

    ranked_games = sum(
        rating.games_played
        for rating in ratings
    )

    ranked_wins = sum(
        rating.wins
        for rating in ratings
    )

    ranked_losses = sum(
        rating.losses
        for rating in ratings
    )

    ranked_draws = sum(
        rating.draws
        for rating in ratings
    )

   

    total_games = (
        len(normal_games)
        + ranked_games
    )

    total_wins = (
        normal_wins
        + ranked_wins
    )

    total_losses = (
        normal_losses
        + ranked_losses
    )

    total_draws = (
        normal_draws
        + ranked_draws
    )

    if total_games > 0:
        win_rate = round(
            (total_wins / total_games) * 100,
            1
        )
    else:
        win_rate = 0.0

    return {
        "total_games": total_games,
        "wins": total_wins,
        "losses": total_losses,
        "draws": total_draws,
        "win_rate": win_rate,

        "ranked_games": ranked_games,
        "ranked_wins": ranked_wins,
        "ranked_losses": ranked_losses,
        "ranked_draws": ranked_draws,

        "ratings": ratings
    }

@app.post("/games", response_model=schemas.GameResponse)
async def create_game(
    game: schemas.GameCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_dep)
):
    if game.win_condition > game.board_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="win_condition must be <= board_size"
        )


    game_status = "in_progress" if game.game_type == "computer" else "waiting"

    db_game = models.Game(
        board_size=game.board_size,
        win_condition=game.win_condition,
        player_x_id=current_user.id,
        player_o_id=None,
        status=game_status,
        game_type=game.game_type
    )

    db.add(db_game)
    db.commit()
    db.refresh(db_game)

  
    game_for_response = (
        db.query(models.Game)
        .options(
            joinedload(models.Game.player_x),
            joinedload(models.Game.player_o)
        )
        .filter(models.Game.id == db_game.id)
        .first()
    )

 
  
    if game.game_type != "computer":
        await manager.broadcast_lobby({
            "type": "game_created",
            "game": {
                "id": game_for_response.id,
                "board_size": game_for_response.board_size,
                "win_condition": game_for_response.win_condition,
                "status": game_for_response.status,
                "created_at": game_for_response.created_at.isoformat(),
                "player_x_id": game_for_response.player_x_id,
                "player_o_id": game_for_response.player_o_id,
                "winner_id": game_for_response.winner_id,
                "game_type": game_for_response.game_type,
                "player_x": {
                    "id": game_for_response.player_x.id,
                    "username": game_for_response.player_x.username,
                    "email": game_for_response.player_x.email,
                    "created_at": game_for_response.player_x.created_at.isoformat()
                } if game_for_response.player_x else None,
                "player_o": None
            }
        })

    return game_for_response

@app.websocket("/ws/lobby")
async def lobby_ws(websocket: WebSocket):
    await manager.connect_lobby(websocket)

    try:
        while True:
            try:
                await websocket.receive_text()
            except WebSocketDisconnect:
                break
            except Exception:
                break

    finally:
        manager.disconnect_lobby(websocket)

@app.get("/games", response_model=List[schemas.GameResponse])
def get_games(db: Session = Depends(get_db)):
    return db.query(models.Game).options(joinedload(models.Game.player_x), joinedload(models.Game.player_o)).filter(models.Game.status == "waiting").all()


@app.get("/games/{game_id}", response_model=schemas.GameResponse)
def get_game(game_id: int, db: Session = Depends(get_db)):
    game = db.query(models.Game).options(joinedload(models.Game.player_x), joinedload(models.Game.player_o)).filter(models.Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return game


@app.post("/games/{game_id}/join", response_model=schemas.GameResponse)
async def join_game(
    game_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_dep)
):
    game = (
        db.query(models.Game)
        .filter(models.Game.id == game_id)
        .first()
    )

    if not game:
        raise HTTPException(
            status_code=404,
            detail="Game not found"
        )

    if game.status != "waiting":
        raise HTTPException(
            status_code=400,
            detail="Game already started"
        )

    if game.player_x_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You are already the creator of this game"
        )

    game.player_o_id = current_user.id
    game.status = "in_progress"

    db.commit()
    db.refresh(game)


    state = get_game_state(game_id, db)

   
    await manager.broadcast(
        game_id,
        {
            "type": "update",
            "state": state
        }
    )

    return game


@app.get("/games/{game_id}/state", response_model=schemas.GameStateResponse)
def get_game_state(game_id: int, db: Session = Depends(get_db)):
    game = db.query(models.Game).filter(models.Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    board = [[None for _ in range(game.board_size)] for _ in range(game.board_size)]
    moves = db.query(models.Move).filter(models.Move.game_id == game_id).all()
    for mv in moves:
        if 0 <= mv.row < game.board_size and 0 <= mv.col < game.board_size:
            board[mv.row][mv.col] = mv.symbol

    x_moves = sum(1 for m in moves if m.symbol == 'X')
    o_moves = sum(1 for m in moves if m.symbol == 'O')
    current_player = 'X' if x_moves <= o_moves else 'O'

    winner = check_winner(board, game.win_condition)

    return {
        "board": board,
        "current_player": current_player,
        "winner": winner,
        "status": game.status,
        "player_x_id": game.player_x_id,
        "player_o_id": game.player_o_id
    }


@app.post(
    "/games/{game_id}/move",
    response_model=schemas.GameStateResponse
)
async def make_move(
    game_id: int,
    move: schemas.MoveCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_dep)
):
    game = (
        db.query(models.Game)
        .filter(models.Game.id == game_id)
        .first()
    )

    if not game:
        raise HTTPException(
            status_code=404,
            detail="Game not found"
        )

    if game.status != "in_progress":
        raise HTTPException(
            status_code=400,
            detail="Game is not in progress"
        )

   
   
    

    board = [
        [None for _ in range(game.board_size)]
        for _ in range(game.board_size)
    ]

    moves = (
        db.query(models.Move)
        .filter(models.Move.game_id == game_id)
        .order_by(models.Move.id)
        .all()
    )

    for m in moves:
        if (
            0 <= m.row < game.board_size
            and 0 <= m.col < game.board_size
        ):
            board[m.row][m.col] = m.symbol

   
   
    

    x_moves = sum(
        1 for m in moves if m.symbol == "X"
    )

    o_moves = sum(
        1 for m in moves if m.symbol == "O"
    )

    current_player = (
        "X"
        if x_moves <= o_moves
        else "O"
    )

   
   
    

    if move.symbol != current_player:
        raise HTTPException(
            status_code=403,
            detail="It's not your turn"
        )

    
    
    

    if current_player == "X":
        if current_user.id != game.player_x_id:
            raise HTTPException(
                status_code=403,
                detail="You are not player X"
            )

    elif current_player == "O":
        if game.player_o_id is None:
            raise HTTPException(
                status_code=403,
                detail="No player O assigned"
            )

        if current_user.id != game.player_o_id:
            raise HTTPException(
                status_code=403,
                detail="You are not player O"
            )
   

    if not (
        0 <= move.row < game.board_size
        and 0 <= move.col < game.board_size
    ):
        raise HTTPException(
            status_code=400,
            detail="Move out of bounds"
        )

    if board[move.row][move.col] is not None:
        raise HTTPException(
            status_code=400,
            detail="Cell already occupied"
        )     

    db_move = models.Move(
        game_id=game_id,
        player_id=current_user.id,
        row=move.row,
        col=move.col,
        symbol=move.symbol
    )

    db.add(db_move)
    db.commit()

    board[move.row][move.col] = move.symbol

 
   
   

    winner = check_winner(
        board,
        game.win_condition
    )

    if winner:
        game.status = "finished"

        if winner == "X":
            game.winner_id = game.player_x_id

        elif winner == "O":
            game.winner_id = game.player_o_id

        
        db.commit()
        process_ranked_result(
        db,
        game
    )
    
  
    

    if (
        game.game_type == "computer"
        and current_player == "X"
        and not winner
    ):
        computer_move = make_computer_move(
            board,
            game.win_condition,
            "O"
        )

        if computer_move:
            cm_row, cm_col = computer_move

            cpu_move = models.Move(
                game_id=game_id,
                player_id=None,
                row=cm_row,
                col=cm_col,
                symbol="O"
            )

            db.add(cpu_move)
            db.commit()

            board[cm_row][cm_col] = "O"

            winner = check_winner(
                board,
                game.win_condition
            )

            if winner:
                game.status = "finished"

                if winner == "X":
                    game.winner_id = game.player_x_id

                elif winner == "O":
                    game.winner_id = None

                db.commit()

    db.refresh(game)

   
    
    

    state = get_game_state(
        game_id,
        db
    )

    
    
    

    await manager.broadcast(
        game_id,
        {
            "type": "update",
            "state": state
        }
    )

    print(
        f"[GAME] Game {game_id}: "
        f"{current_user.username} played "
        f"{move.symbol} at "
        f"({move.row}, {move.col})"
    )

    return state



@app.websocket("/ws/games/{game_id}")
async def game_ws(websocket: WebSocket, game_id: int, token: str = Query(None)):
    
    if not token:
        await websocket.close(code=1008)
        return

   
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        email = payload.get("sub")
        if email is None:
            await websocket.close(code=1008)
            return
    except JWTError:
        await websocket.close(code=1008)
        return

    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            await websocket.close(code=1008)
            return

       
        await manager.connect(game_id, websocket)

       
        try:
            state = get_game_state(game_id, db)
            await websocket.send_json({"type": "init", "state": state})
        except Exception:
           
            await websocket.send_json({"type": "init", "state": {"board": [], "current_player": "X", "winner": None, "status": "waiting"}})

       
        try:
            while True:
                try:
                    _ = await websocket.receive_text()
                   
                except WebSocketDisconnect:
                    manager.disconnect(game_id, websocket)
                    break
                except Exception:
                    manager.disconnect(game_id, websocket)
                    break
        finally:
            manager.disconnect(game_id, websocket)
    finally:
        db.close()

@app.post(
    "/ranked/queue/{board_size}",
    response_model=schemas.RankedQueueResponse
)
async def join_ranked_queue(
    board_size: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_dep)
):
    if board_size not in RANKED_BOARD_SIZES:
        raise HTTPException(
            status_code=400,
            detail="Недопустимый размер поля"
        )

    ensure_player_ratings(
        db,
        current_user.id
    )

    queue = ranked_queues[board_size]

  
    if current_user.id in queue:
        return {
            "status": "waiting",
            "board_size": board_size
        }

    
    opponent_id = None

    for user_id in queue:
        if user_id != current_user.id:
            opponent_id = user_id
            break

 
    if opponent_id is not None:

        queue.remove(opponent_id)

        player_x_id = opponent_id

        player_o_id = current_user.id

        x_rating = get_player_rating(
            db,
            player_x_id,
            board_size
        )

        o_rating = get_player_rating(
            db,
            player_o_id,
            board_size
        )

        
        game = models.Game(
            board_size=board_size,
            win_condition=board_size,
            status="in_progress",
            player_x_id=player_x_id,
            player_o_id=player_o_id,
            game_type="ranked"
        )

        db.add(game)
        db.commit()
        db.refresh(game)

        ranked_match = models.RankedMatch(
            game_id=game.id,
            board_size=board_size,

            player_x_id=player_x_id,
            player_o_id=player_o_id,

            player_x_rating_before=x_rating.rating,
            player_o_rating_before=o_rating.rating,

            rating_processed=False
        )

        db.add(ranked_match)
        db.commit()
        db.refresh(ranked_match)

  
        opponent_ws = ranked_connections.get(
            opponent_id
        )

        if opponent_ws:
            try:
                await opponent_ws.send_json({
                    "type": "match_found",
                    "game_id": game.id,
                    "board_size": board_size,
                    "opponent_id": current_user.id
                })
            except Exception:
                pass

  
        return {
            "status": "matched",
            "board_size": board_size,
            "game_id": game.id,
            "opponent_id": opponent_id
        }

    queue.append(current_user.id)

    print(
        f"[RANKED] User {current_user.id} "
        f"joined {board_size}x{board_size} queue"
    )

    return {
        "status": "waiting",
        "board_size": board_size
    }
@app.delete("/ranked/queue/{board_size}")
def leave_ranked_queue(
    board_size: int,
    current_user: models.User = Depends(
        get_current_user_dep
    )
):
    if board_size not in RANKED_BOARD_SIZES:
        raise HTTPException(
            status_code=400,
            detail="Недопустимый размер поля"
        )

    queue = ranked_queues[board_size]

    if current_user.id in queue:
        queue.remove(current_user.id)

        print(
            f"[RANKED] User {current_user.id} "
            f"left {board_size}x{board_size} queue"
        )

    return {
        "status": "cancelled",
        "board_size": board_size
    }

@app.get(
    "/ranked/rating/{board_size}",
    response_model=schemas.PlayerRatingResponse
)
def get_rating(
    board_size: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_dep)
):
    if board_size not in RANKED_BOARD_SIZES:
        raise HTTPException(
            status_code=400,
            detail="Недопустимый размер поля"
        )

    rating = get_player_rating(
        db,
        current_user.id,
        board_size
    )

    return rating

@app.get(
    "/ranked/history",
    response_model=List[schemas.RankedMatchHistoryResponse]
)
def get_ranked_history(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_dep)
):
    matches = (
        db.query(models.RankedMatch)
        .filter(
            (
                models.RankedMatch.player_x_id
                == current_user.id
            )
            |
            (
                models.RankedMatch.player_o_id
                == current_user.id
            )
        )
        .order_by(
            models.RankedMatch.created_at.desc()
        )
        .limit(50)
        .all()
    )

    return matches
@app.get(
    "/news",
    response_model=List[schemas.NewsResponse]
)
def get_news(
    db: Session = Depends(get_db)
):
    news = (
        db.query(models.News)
        .options(
            joinedload(models.News.author)
        )
        .filter(
            models.News.status == "published",
            models.News.deleted_at.is_(None)
        )
        .order_by(
            models.News.published_at.desc()
        )
        .all()
    )

    return news

@app.post(
    "/news",
    response_model=schemas.NewsResponse
)
def create_news(
    news_data: schemas.NewsCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user_dep
    )
):
    news = models.News(
        title=news_data.title,
        content=news_data.content,
        image_url=news_data.image_url,
        author_id=current_user.id,
        status="pending"
    )

    db.add(news)
    db.commit()
    db.refresh(news)

    return news
@app.get(
    "/news/my",
    response_model=List[schemas.NewsResponse]
)
def get_my_news(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user_dep
    )
):
    news = (
        db.query(models.News)
        .options(
            joinedload(models.News.author)
        )
        .filter(
            models.News.author_id == current_user.id,
            models.News.deleted_at.is_(None)
        )
        .order_by(
            models.News.created_at.desc()
        )
        .all()
    )

    return news
@app.get(
    "/news/{news_id}",
    response_model=schemas.NewsResponse
)
def get_news_item(
    news_id: int,
    db: Session = Depends(get_db)
):
    news = (
        db.query(models.News)
        .options(
            joinedload(models.News.author)
        )
        .filter(
            models.News.id == news_id,
            models.News.status == "published",
            models.News.deleted_at.is_(None)
        )
        .first()
    )

    if not news:
        raise HTTPException(
            status_code=404,
            detail="Новость не найдена"
        )

    return news
@app.get(
    "/admin/news/pending",
    response_model=List[schemas.NewsResponse]
)
def get_pending_news(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(
        get_current_admin
    )
):
    news = (
        db.query(models.News)
        .options(
            joinedload(models.News.author)
        )
        .filter(
            models.News.status == "pending",
            models.News.deleted_at.is_(None)
        )
        .order_by(
            models.News.created_at.asc()
        )
        .all()
    )

    return news
@app.post(
    "/admin/news/{news_id}/publish",
    response_model=schemas.NewsResponse
)
def publish_news(
    news_id: int,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(
        get_current_admin
    )
):
    news = (
        db.query(models.News)
        .filter(
            models.News.id == news_id,
            models.News.deleted_at.is_(None)
        )
        .first()
    )

    if not news:
        raise HTTPException(
            status_code=404,
            detail="Новость не найдена"
        )

    news.status = "published"
    news.published_at = datetime.utcnow()
    news.published_by = current_admin.id
    news.rejection_reason = None

    db.commit()
    db.refresh(news)

    return news
@app.post(
    "/admin/news/{news_id}/reject",
    response_model=schemas.NewsResponse
)
def reject_news(
    news_id: int,
    data: schemas.NewsReject,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(
        get_current_admin
    )
):
    news = (
        db.query(models.News)
        .filter(
            models.News.id == news_id,
            models.News.deleted_at.is_(None)
        )
        .first()
    )

    if not news:
        raise HTTPException(
            status_code=404,
            detail="Новость не найдена"
        )

    news.status = "rejected"
    news.rejection_reason = data.reason

    db.commit()
    db.refresh(news)

    return news
@app.put(
    "/admin/news/{news_id}",
    response_model=schemas.NewsResponse
)
def update_news(
    news_id: int,
    data: schemas.NewsUpdate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(
        get_current_admin
    )
):
    news = (
        db.query(models.News)
        .filter(
            models.News.id == news_id,
            models.News.deleted_at.is_(None)
        )
        .first()
    )

    if not news:
        raise HTTPException(
            status_code=404,
            detail="Новость не найдена"
        )

    if data.title is not None:
        news.title = data.title

    if data.content is not None:
        news.content = data.content

    if data.image_url is not None:
        news.image_url = data.image_url

    db.commit()
    db.refresh(news)

    return news
@app.delete(
    "/admin/news/{news_id}"
)
def delete_news(
    news_id: int,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(
        get_current_admin
    )
):
    news = (
        db.query(models.News)
        .filter(
            models.News.id == news_id,
            models.News.deleted_at.is_(None)
        )
        .first()
    )

    if not news:
        raise HTTPException(
            status_code=404,
            detail="Новость не найдена"
        )

    news.deleted_at = datetime.utcnow()
    news.deleted_by = current_admin.id

    db.commit()

    return {
        "status": "deleted",
        "news_id": news_id
    }
@app.get(
    "/admin/news",
    response_model=List[schemas.NewsResponse]
)
def get_admin_news(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(
        get_current_admin
    )
):
    return db.query(models.News).filter(
        models.News.deleted_at.is_(None)
    ).order_by(
        models.News.created_at.desc()
    ).all()

    return news

@app.get(
    "/profile/games",
    response_model=schemas.GameHistoryResponse
)
def get_profile_games(
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_dep)
):

    if page < 1:
        page = 1

    if per_page < 1:
        per_page = 20

    if per_page > 100:
        per_page = 100

    

    base_query = (
        db.query(models.Game)
        .filter(
            models.Game.status == "finished",
            (
                (models.Game.player_x_id == current_user.id)
                |
                (models.Game.player_o_id == current_user.id)
            )
        )
    )

    total = base_query.count()

    pages = (
        (total + per_page - 1) // per_page
        if total > 0
        else 0
    )

    if pages > 0 and page > pages:
        page = pages

    offset = (page - 1) * per_page

    games = (
        base_query
        .options(
            joinedload(models.Game.player_x),
            joinedload(models.Game.player_o)
        )
        .order_by(
            models.Game.created_at.desc()
        )
        .offset(offset)
        .limit(per_page)
        .all()
    )

    game_ids = [
        game.id
        for game in games
        if game.game_type == "ranked"
    ]

    ranked_matches = {}

    if game_ids:
        matches = (
            db.query(models.RankedMatch)
            .filter(
                models.RankedMatch.game_id.in_(game_ids)
            )
            .all()
        )

        ranked_matches = {
            match.game_id: match
            for match in matches
        }

    result = []

    for game in games:

        if game.game_type == "ranked":

            ranked_match = ranked_matches.get(game.id)

            if game.winner_id == current_user.id:
                game_result = "win"

            elif (
                ranked_match
                and ranked_match.is_draw
            ):
                game_result = "draw"

            else:
                game_result = "loss"

          
            if game.player_x_id == current_user.id:
                opponent = game.player_o
            else:
                opponent = game.player_x

            if opponent:
                opponent_data = {
                    "id": opponent.id,
                    "username": opponent.username
                }
            else:
                opponent_data = {
                    "id": None,
                    "username": "Неизвестный игрок"
                }

            rating_change = None

            if ranked_match:

                if (
                    ranked_match.player_x_id
                    == current_user.id
                ):
                    rating_change = (
                        ranked_match.rating_change_x
                    )

                elif (
                    ranked_match.player_o_id
                    == current_user.id
                ):
                    rating_change = (
                        ranked_match.rating_change_o
                    )

            result.append({
                "id": game.id,
                "result": game_result,
                "game_type": "ranked",
                "board_size": game.board_size,
                "win_condition": game.win_condition,
                "opponent": opponent_data,
                "rating_change": rating_change,
                "created_at": game.created_at,
                "finished_at": (
                    ranked_match.finished_at
                    if ranked_match
                    else None
                ),
                "status": game.status
            })

            continue

   

        if game.player_x_id == current_user.id:
            opponent = game.player_o
        else:
            opponent = game.player_x

 


        if game.game_type == "computer":

            opponent_data = {
                "id": None,
                "username": "Компьютер"
            }


            board = [
                [None for _ in range(game.board_size)]
                for _ in range(game.board_size)
            ]

            moves = (
                db.query(models.Move)
                .filter(
                    models.Move.game_id == game.id
                )
                .order_by(models.Move.id)
                .all()
            )

            for move in moves:
                if (
                    0 <= move.row < game.board_size
                    and
                    0 <= move.col < game.board_size
                ):
                    board[move.row][move.col] = move.symbol

            winner = check_winner(
                board,
                game.win_condition
            )

            if winner == "X":
                game_result = "win"

            elif winner == "O":
                game_result = "loss"

            else:
                game_result = "draw"



        else:

            if game.winner_id is None:
                game_result = "draw"

            elif game.winner_id == current_user.id:
                game_result = "win"

            else:
                game_result = "loss"

            if opponent:
                opponent_data = {
                    "id": opponent.id,
                    "username": opponent.username
                }
            else:
                opponent_data = {
                    "id": None,
                    "username": "Неизвестный игрок"
                }

        result.append({
            "id": game.id,
            "result": game_result,
            "game_type": game.game_type,
            "board_size": game.board_size,
            "win_condition": game.win_condition,
            "opponent": opponent_data,
            "rating_change": None,
            "created_at": game.created_at,
            "finished_at": game.created_at,
            "status": game.status
        })

    return {
        "items": result,
        "page": page,
        "per_page": per_page,
        "total": total,
        "pages": pages
    }
@app.get(
    "/ranked/match/{game_id}",
    response_model=schemas.RankedMatchDetailResponse
)
def get_ranked_match(
    game_id: int,
    db=Depends(get_db),
    current_user=Depends(get_current_user_dep)
):
    ranked_match = (
        db.query(models.RankedMatch)
        .options(
            joinedload(models.RankedMatch.player_x),
            joinedload(models.RankedMatch.player_o)
        )
        .filter(models.RankedMatch.game_id == game_id)
        .first()
    )

    if not ranked_match:
        raise HTTPException(
            status_code=404,
            detail="Рейтинговый матч не найден"
        )

 
    if (
        ranked_match.player_x_id != current_user.id
        and ranked_match.player_o_id != current_user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="Вы не являетесь участником этого матча"
        )

    return {
        "game_id": ranked_match.game_id,
        "board_size": ranked_match.board_size,

        "player_x_id": ranked_match.player_x_id,
        "player_o_id": ranked_match.player_o_id,

        "player_x_username": ranked_match.player_x.username,
        "player_o_username": ranked_match.player_o.username,

        "player_x_rating_before": ranked_match.player_x_rating_before,
        "player_o_rating_before": ranked_match.player_o_rating_before,

        "player_x_rating_after": ranked_match.player_x_rating_after,
        "player_o_rating_after": ranked_match.player_o_rating_after,

        "rating_change_x": ranked_match.rating_change_x,
        "rating_change_o": ranked_match.rating_change_o,

        "winner_id": ranked_match.winner_id,
        "is_draw": ranked_match.is_draw,

        "created_at": ranked_match.created_at,
        "finished_at": ranked_match.finished_at
    }

@app.websocket("/ws/ranked/{board_size}")
async def ranked_ws(
    websocket: WebSocket,
    board_size: int,
    token: str = Query(None)
):
    if board_size not in RANKED_BOARD_SIZES:
        await websocket.close(code=1008)
        return

    if not token:
        await websocket.close(code=1008)
        return



    try:
        payload = jwt.decode(
            token,
            auth.SECRET_KEY,
            algorithms=[auth.ALGORITHM]
        )

        email = payload.get("sub")

        if email is None:
            await websocket.close(code=1008)
            return

    except JWTError:
        await websocket.close(code=1008)
        return


    db = SessionLocal()

    try:
        user = (
            db.query(models.User)
            .filter(models.User.email == email)
            .first()
        )

        if not user:
            await websocket.close(code=1008)
            return

        await websocket.accept()

        ranked_connections[user.id] = websocket

        print(
            f"[RANKED WS] User {user.id} connected"
        )


        try:
            while True:
                await websocket.receive_text()

        except WebSocketDisconnect:
            pass

        finally:
            if ranked_connections.get(user.id) == websocket:
                del ranked_connections[user.id]

           

            print(
                f"[RANKED WS] User {user.id} disconnected"
            )

    finally:
        db.close()



def check_winner(board, win_condition):
    size = len(board)
    for i in range(size):
        for j in range(size - win_condition + 1):
            if board[i][j] is not None and all(board[i][j] == board[i][j + k] for k in range(1, win_condition)):
                return board[i][j]
    for j in range(size):
        for i in range(size - win_condition + 1):
            if board[i][j] is not None and all(board[i][j] == board[i + k][j] for k in range(1, win_condition)):
                return board[i][j]
    for i in range(size - win_condition + 1):
        for j in range(size - win_condition + 1):
            if board[i][j] is not None and all(board[i][j] == board[i + k][j + k] for k in range(1, win_condition)):
                return board[i][j]
    for i in range(size - win_condition + 1):
        for j in range(win_condition - 1, size):
            if board[i][j] is not None and all(board[i][j] == board[i + k][j - k] for k in range(1, win_condition)):
                return board[i][j]
    if all(all(cell is not None for cell in row) for row in board):
        return "Draw"
    return None


def make_computer_move(board, win_condition, symbol):
    size = len(board)
    opponent = 'X' if symbol == 'O' else 'O'
    for i in range(size):
        for j in range(size):
            if board[i][j] is None:
                board[i][j] = symbol
                if check_winner(board, win_condition) == symbol:
                    board[i][j] = None
                    return (i, j)
                board[i][j] = None
    for i in range(size):
        for j in range(size):
            if board[i][j] is None:
                board[i][j] = opponent
                if check_winner(board, win_condition) == opponent:
                    board[i][j] = None
                    return (i, j)
                board[i][j] = None
    center = size // 2
    if board[center][center] is None:
        return (center, center)
    corners = [(0, 0), (0, size - 1), (size - 1, 0), (size - 1, size - 1)]
    for c in corners:
        if board[c[0]][c[1]] is None:
            return c
    for i in range(size):
        for j in range(size):
            if board[i][j] is None:
                return (i, j)
    return None

def process_ranked_result(
    db: Session,
    game: models.Game
):
    if game.game_type != "ranked":
        return

    ranked_match = (
        db.query(models.RankedMatch)
        .filter(
            models.RankedMatch.game_id == game.id
        )
        .first()
    )

    if not ranked_match:
        return


    if ranked_match.rating_processed:
        return

    player_x_rating = get_player_rating(
        db,
        game.player_x_id,
        game.board_size
    )

    player_o_rating = get_player_rating(
        db,
        game.player_o_id,
        game.board_size
    )




    if game.winner_id is None:

        new_x_rating = calculate_new_rating(
            player_x_rating.rating,
            player_o_rating.rating,
            0.5
        )

        new_o_rating = calculate_new_rating(
            player_o_rating.rating,
            player_x_rating.rating,
            0.5
        )

        player_x_rating.draws += 1
        player_o_rating.draws += 1

        ranked_match.is_draw = True



    elif game.winner_id == game.player_x_id:

        new_x_rating = calculate_new_rating(
            player_x_rating.rating,
            player_o_rating.rating,
            1
        )

        new_o_rating = calculate_new_rating(
            player_o_rating.rating,
            player_x_rating.rating,
            0
        )

        player_x_rating.wins += 1
        player_o_rating.losses += 1

        ranked_match.winner_id = game.player_x_id

    else:

        new_x_rating = calculate_new_rating(
            player_x_rating.rating,
            player_o_rating.rating,
            0
        )

        new_o_rating = calculate_new_rating(
            player_o_rating.rating,
            player_x_rating.rating,
            1
        )

        player_x_rating.losses += 1
        player_o_rating.wins += 1

        ranked_match.winner_id = game.player_o_id



    old_x_rating = player_x_rating.rating
    old_o_rating = player_o_rating.rating

    player_x_rating.rating = new_x_rating
    player_o_rating.rating = new_o_rating

    player_x_rating.games_played += 1
    player_o_rating.games_played += 1



    ranked_match.player_x_rating_after = new_x_rating
    ranked_match.player_o_rating_after = new_o_rating

    ranked_match.rating_change_x = (
        new_x_rating - old_x_rating
    )

    ranked_match.rating_change_o = (
        new_o_rating - old_o_rating
    )



    winner_user = None

    if game.winner_id is not None:
        winner_user = (
            db.query(models.User)
            .filter(
                models.User.id == game.winner_id
            )
            .first()
        )

    if winner_user:
        winner_user.coins += 1

        db.add(
            models.CoinTransaction(
                user_id=winner_user.id,
                amount=1,
                reason="ranked_win"
            )
        )
    ranked_match.rating_processed = True
    ranked_match.finished_at = datetime.utcnow()

    db.commit()

    print(
        f"[RANKED] Game {game.id} finished: "
        f"X {old_x_rating} -> {new_x_rating}, "
        f"O {old_o_rating} -> {new_o_rating}"
    )

@app.get("/ranked/leaderboard/{board_size}")
def get_ranked_leaderboard(
    board_size: int,
    db: Session = Depends(get_db)
):
    if board_size not in RANKED_BOARD_SIZES:
        raise HTTPException(
            status_code=400,
            detail="Недопустимый размер поля"
        )

    ratings = (
        db.query(models.PlayerRating)
        .options(
            joinedload(models.PlayerRating.user)
        )
        .filter(
            models.PlayerRating.board_size == board_size
        )
        .order_by(
            models.PlayerRating.rating.desc(),
            models.PlayerRating.games_played.desc()
        )
        .all()
    )

    return [
        {
            "user_id": rating.user_id,
            "username": rating.user.username,
            "board_size": rating.board_size,
            "rating": rating.rating,
            "wins": rating.wins,
            "losses": rating.losses,
            "draws": rating.draws,
            "games_played": rating.games_played
        }
        for rating in ratings
    ]

@app.get("/ranked/leaderboard/{board_size}")
def get_ranked_leaderboard(
    board_size: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_dep)
):

    if board_size not in RANKED_BOARD_SIZES:
        raise HTTPException(
            status_code=400,
            detail="Недопустимый размер поля"
        )

    rows = (
        db.query(
            models.PlayerRating,
            models.User.username
        )
        .join(
            models.User,
            models.User.id == models.PlayerRating.user_id
        )
        .filter(
            models.PlayerRating.board_size == board_size
        )
        .order_by(
            models.PlayerRating.rating.desc(),
            models.PlayerRating.games_played.desc(),
            models.PlayerRating.wins.desc(),
            models.User.username.asc()
        )
        .all()
    )


    players = []

    for position, (rating, username) in enumerate(
        rows,
        start=1
    ):
        players.append({
            "position": position,

            "user_id": rating.user_id,
            "username": username,

            "board_size": rating.board_size,

            "rating": rating.rating,

            "wins": rating.wins,
            "losses": rating.losses,
            "draws": rating.draws,

            "games_played": rating.games_played
        })

    return {
        "players": players,
        "board_size": board_size
    }

