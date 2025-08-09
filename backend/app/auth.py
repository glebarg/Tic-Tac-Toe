from jose import  jwt
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext

SECRET_KEY = "your-secret-key"  
ALGORITHM = "HS256"
ACCESS_EXPIRE_MINUTES = 1
REFRESH_EXPIRE_DAYS = 2

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_tokens(data: dict):
    access_data = data.copy()
    refresh_data = data.copy()
    
    access_expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_EXPIRE_MINUTES)
    refresh_expire = datetime.now(timezone.utc) + timedelta(minutes=REFRESH_EXPIRE_DAYS)
    
    access_data.update({"exp": access_expire})
    refresh_data.update({"exp": refresh_expire})
    
    access_token = jwt.encode(access_data, SECRET_KEY, algorithm=ALGORITHM)
    refresh_token = jwt.encode(refresh_data, SECRET_KEY, algorithm=ALGORITHM)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }