from pydantic import BaseModel, EmailStr, Field  
from datetime import datetime
from typing import List, Optional

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    refresh_token: str

class GameCreate(BaseModel):
    board_size: int = Field(ge=3, le=10)
    win_condition: int = Field(ge=3, le=10)
    game_type: str  

class GameResponse(BaseModel):
    id: int
    board_size: int
    win_condition: int
    status: str
    created_at: datetime
    player_x_id: int
    player_o_id: Optional[int]
    winner_id: Optional[int]
    game_type: str

class MoveCreate(BaseModel):
    row: int
    col: int
    symbol: str

class GameStateResponse(BaseModel):
    board: List[List[Optional[str]]]  
    current_player: str  
    winner: Optional[str]
    status: str

class RefreshToken(BaseModel):
    refresh_token: str

class UserPublic(BaseModel):
    id: int
    username: str
    email: EmailStr
    created_at: datetime

    class Config:
        orm_mode = True

class GameResponse(BaseModel):
    id: int
    board_size: int
    win_condition: int
    status: str
    created_at: datetime
    player_x_id: int
    player_o_id: Optional[int]
    winner_id: Optional[int]
    game_type: str
    player_x: Optional[UserPublic] = None   
    player_o: Optional[UserPublic] = None  

    class Config:
        orm_mode = True

class GameStateResponse(BaseModel):
    board: List[List[Optional[str]]]
    current_player: str
    winner: Optional[str]
    status: str
    player_x_id: Optional[int]
    player_o_id: Optional[int]

    class Config:
        orm_mode = True

class PlayerRatingResponse(BaseModel):
    board_size: int
    rating: int
    wins: int
    losses: int
    draws: int
    games_played: int

    class Config:
        orm_mode = True

class ProfileStatsResponse(BaseModel):
    total_games: int
    wins: int
    losses: int
    draws: int
    win_rate: float

    ranked_games: int
    ranked_wins: int
    ranked_losses: int
    ranked_draws: int

    ratings: List[PlayerRatingResponse]

class RankedQueueResponse(BaseModel):
    status: str
    board_size: int
    game_id: Optional[int] = None
    opponent_id: Optional[int] = None


class RankedGameResponse(BaseModel):
    game_id: int
    board_size: int
    player_x_id: int
    player_o_id: int
    player_x_rating: int
    player_o_rating: int


class RankedMatchHistoryResponse(BaseModel):
    id: int
    game_id: int
    board_size: int

    player_x_id: int
    player_o_id: int

    player_x_rating_before: int
    player_o_rating_before: int

    player_x_rating_after: Optional[int]
    player_o_rating_after: Optional[int]

    rating_change_x: Optional[int]
    rating_change_o: Optional[int]

    winner_id: Optional[int]
    is_draw: bool

    created_at: datetime
    finished_at: Optional[datetime]

    class Config:
        orm_mode = True

class RankedMatchDetailResponse(BaseModel):
    game_id: int
    board_size: int

    player_x_id: int
    player_o_id: int

    player_x_username: str
    player_o_username: str

    player_x_rating_before: int
    player_o_rating_before: int

    player_x_rating_after: Optional[int] = None
    player_o_rating_after: Optional[int] = None

    rating_change_x: Optional[int] = None
    rating_change_o: Optional[int] = None

    winner_id: Optional[int] = None
    is_draw: bool

    created_at: datetime
    finished_at: Optional[datetime] = None

    class Config:
        orm_mode = True

class NewsCreate(BaseModel):
    title: str = Field(
        min_length=3,
        max_length=200
    )

    content: str = Field(
        min_length=1
    )

    image_url: Optional[str] = Field(
        default=None,
        max_length=500
    )


class NewsUpdate(BaseModel):
    title: Optional[str] = Field(
        default=None,
        min_length=3,
        max_length=200
    )

    content: Optional[str] = Field(
        default=None,
        min_length=1
    )

    image_url: Optional[str] = Field(
        default=None,
        max_length=500
    )


class NewsReject(BaseModel):
    reason: Optional[str] = Field(
        default=None,
        max_length=1000
    )


class NewsAuthorResponse(BaseModel):
    id: int
    username: str

    class Config:
        orm_mode = True


class NewsResponse(BaseModel):
    id: int

    title: str
    content: str

    image_url: Optional[str]

    author_id: int
    author: Optional[NewsAuthorResponse]

    status: str

    rejection_reason: Optional[str]

    created_at: datetime
    updated_at: datetime

    published_at: Optional[datetime]

    published_by: Optional[int]

    class Config:
        orm_mode = True

class GameHistoryOpponent(BaseModel):
    id: Optional[int] = None
    username: str


class GameHistoryItem(BaseModel):
    id: int

    result: str
    game_type: str

    board_size: int
    win_condition: int

    opponent: GameHistoryOpponent

    rating_change: Optional[int] = None

    created_at: datetime
    finished_at: Optional[datetime] = None

    status: str

    class Config:
        orm_mode = True


class GameHistoryResponse(BaseModel):
    items: List[GameHistoryItem]

    page: int
    per_page: int

    total: int
    pages: int


class CoinBalanceResponse(BaseModel):
    coins: int


class ShopItemResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price: int
    effect_type: str
    animation: str

    class Config:
        orm_mode = True


class UserItemResponse(BaseModel):
    item: ShopItemResponse
    quantity: int


class ShopResponse(BaseModel):
    coins: int
    items: List[ShopItemResponse]
    inventory: List[UserItemResponse]


class BuyItemRequest(BaseModel):
    item_id: int


class UseItemRequest(BaseModel):
    item_id: int
    
class LeaderboardPlayerResponse(BaseModel):
    position: int
    user_id: int
    username: str

    rating: int

    wins: int
    losses: int
    draws: int

    games_played: int


class LeaderboardResponse(BaseModel):
    board_size: int
    players: List[LeaderboardPlayerResponse]