from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, Boolean, DateTime, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from werkzeug.security import generate_password_hash, check_password_hash

import atexit
import uuid
import datetime
import os

# Create a base class for declarative class definitions
Base = declarative_base()

# -----------------------------------------------------------------------------
# Tables
class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    username = Column(String(64), unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    created_at = Column(String, default=lambda: str(datetime.datetime.now()))
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "created_at": self.created_at
        }
    
class DBSession:
    def __init__(self, db_path) -> None:
        self.engine = create_engine(f'sqlite:///{db_path}')
        Base.metadata.create_all(self.engine)
        Session = sessionmaker(bind=self.engine)
        self.session = Session()
        
        atexit.register(self.destuctor)
        
    def destuctor(self):
        self.session.close()
        
# -----------------------------------------------------------------------------
# User methods
    def register_user(self, username, email, password):
        # Check if user already exists
        existing_user = self.session.query(User).filter(
            (User.username == username) | (User.email == email)
        ).first()
        
        if existing_user:
            return None
            
        # Create new user
        user = User(username=username, email=email)
        user.set_password(password)
        
        self.session.add(user)
        self.session.commit()
        
        return user.to_dict()
    
    def authenticate_user(self, email, password):
        user = self.session.query(User).filter_by(email=email).first()
        
        if user and user.check_password(password):
            return user.to_dict()
        
        return None
    
    def get_user_by_id(self, user_id):
        user = self.session.query(User).filter_by(id=user_id).first()
        if user:
            return user.to_dict()
        return None