from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime, timezone

class User(Base):
    __tablename__ = "users"
   
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(128), nullable=False)
    role = Column(String(20),nullable=False,default="user")
    coins = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Game(Base):
    __tablename__ = "games"

    id = Column(Integer, primary_key=True, index=True)
    board_size = Column(Integer, default=3)
    win_condition = Column(Integer, default=3)
    status = Column(String, default="waiting")
    created_at = Column(DateTime, default=datetime.utcnow)

    player_x_id = Column(Integer, ForeignKey("users.id"))
    player_o_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    winner_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    game_type = Column(String, default="human")

    player_x = relationship(
        "User",
        foreign_keys=[player_x_id]
    )

    player_o = relationship(
        "User",
        foreign_keys=[player_o_id]
    )

    winner = relationship(
        "User",
        foreign_keys=[winner_id]
    )


class Move(Base):
    __tablename__ = "moves"

    id = Column(Integer, primary_key=True, index=True)

    game_id = Column(
        Integer,
        ForeignKey("games.id")
    )

    player_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    row = Column(Integer)
    col = Column(Integer)
    symbol = Column(String(1))

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    game = relationship(
        "Game",
        backref="moves"
    )

    player = relationship(
        "User"
    )

class PlayerRating(Base):
    __tablename__ = "player_ratings"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    board_size = Column(
        Integer,
        nullable=False
    )

    rating = Column(
        Integer,
        default=1000,
        nullable=False
    )

    wins = Column(
        Integer,
        default=0,
        nullable=False
    )

    losses = Column(
        Integer,
        default=0,
        nullable=False
    )

    draws = Column(
        Integer,
        default=0,
        nullable=False
    )

    games_played = Column(
        Integer,
        default=0,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    user = relationship(
        "User",
        backref="ratings"
    )

class RankedMatch(Base):
    __tablename__ = "ranked_matches"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    game_id = Column(
        Integer,
        ForeignKey("games.id"),
        unique=True,
        nullable=False
    )

    board_size = Column(
        Integer,
        nullable=False
    )

    player_x_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    player_o_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    player_x_rating_before = Column(
        Integer,
        nullable=False
    )

    player_o_rating_before = Column(
        Integer,
        nullable=False
    )

    player_x_rating_after = Column(
        Integer,
        nullable=True
    )

    player_o_rating_after = Column(
        Integer,
        nullable=True
    )

    rating_change_x = Column(
        Integer,
        nullable=True
    )

    rating_change_o = Column(
        Integer,
        nullable=True
    )

    winner_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    is_draw = Column(
        Boolean,
        default=False,
        nullable=False
    )

    rating_processed = Column(
        Boolean,
        default=False,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    finished_at = Column(
        DateTime,
        nullable=True
    )

    game = relationship(
        "Game"
    )

    player_x = relationship(
        "User",
        foreign_keys=[player_x_id]
    )

    player_o = relationship(
        "User",
        foreign_keys=[player_o_id]
    )

    winner = relationship(
        "User",
        foreign_keys=[winner_id]
    )


class News(Base):
    __tablename__ = "news"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    title = Column(
        String(200),
        nullable=False
    )

    content = Column(
        String,
        nullable=False
    )

    image_url = Column(
        String(500),
        nullable=True
    )

    author_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    status = Column(
        String(20),
        nullable=False,
        default="pending"
    )

    rejection_reason = Column(
        String(1000),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    published_at = Column(
        DateTime,
        nullable=True
    )

    published_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    deleted_at = Column(
        DateTime,
        nullable=True
    )

    deleted_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    author = relationship(
        "User",
        foreign_keys=[author_id]
    )

    publisher = relationship(
        "User",
        foreign_keys=[published_by]
    )

    deleter = relationship(
        "User",
        foreign_keys=[deleted_by]
    )
class CoinTransaction(Base):
    __tablename__ = "coin_transactions"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    amount = Column(
        Integer,
        nullable=False
    )

    reason = Column(
        String(100),
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    user = relationship(
        "User",
        backref="coin_transactions"
    )

class ShopItem(Base):
    __tablename__ = "shop_items"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String(100),
        nullable=False
    )

    description = Column(
        String(500),
        nullable=True
    )

    price = Column(
        Integer,
        nullable=False
    )

    effect_type = Column(
        String(50),
        nullable=False
    )

    animation = Column(
        String(50),
        nullable=False
    )

    is_active = Column(
        Boolean,
        default=True,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )
class UserItem(Base):
    __tablename__ = "user_items"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    item_id = Column(
        Integer,
        ForeignKey("shop_items.id"),
        nullable=False
    )

    quantity = Column(
        Integer,
        default=0,
        nullable=False
    )

    user = relationship(
        "User",
        backref="items"
    )

    item = relationship(
        "ShopItem"
    )
    
class GameItemUse(Base):
    __tablename__ = "game_item_uses"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    game_id = Column(
        Integer,
        ForeignKey("games.id"),
        nullable=False
    )

    item_id = Column(
        Integer,
        ForeignKey("shop_items.id"),
        nullable=False
    )

    from_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    target_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    game = relationship("Game")

    item = relationship("ShopItem")

    from_user = relationship(
        "User",
        foreign_keys=[from_user_id]
    )

    target_user = relationship(
        "User",
        foreign_keys=[target_user_id]
    )