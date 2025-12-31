from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.deps import get_db
from app.services.auth_service import register_user, login_user
from app.schemas.auth import UserCreate, UserLogin, Token, UserResponse

router = APIRouter()

@router.post("/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    try:
        # Pass the UserCreate object directly to the service
        user = register_user(db=db, user_data=user_data)
        return user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login and get JWT access token."""
    # Pass the UserLogin object directly to the service (create one if needed, but service expects UserLogin)
    # Wait, checking service signature: def login_user(db: Session, login_data: UserLogin)
    
    result = login_user(db=db, login_data=credentials)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return result