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

class Project(Base):
    __tablename__ = 'projects'
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(String(500))
    is_private = Column(Boolean, default=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(String, default=lambda: str(datetime.datetime.now()))
    
    # Relationship
    tags = relationship("Tag", back_populates="project", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "is_private": self.is_private,
            "user_id": self.user_id,
            "created_at": self.created_at,
            "tags": [tag.name for tag in self.tags]
        }

class Tag(Base):
    __tablename__ = 'tags'
    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False)
    
    # Relationship
    project = relationship("Project", back_populates="tags")
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "project_id": self.project_id
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
        
    def update_user_email(self, user_id, new_email):
        # Check if email already exists
        existing_user = self.session.query(User).filter_by(email=new_email).first()
        
        if existing_user and existing_user.id != user_id:
            return False, "Email already in use by another account"
            
        user = self.session.query(User).filter_by(id=user_id).first()
        
        if not user:
            return False, "User not found"
            
        user.email = new_email
        self.session.commit()
        
        return True, "Email updated successfully"
        
    def delete_user(self, user_id):
        user = self.session.query(User).filter_by(id=user_id).first()
        
        if not user:
            return False
            
        # Delete all user's projects first (which will cascade delete tags)
        self.session.query(Project).filter_by(user_id=user_id).delete()
        
        # Delete user
        self.session.delete(user)
        self.session.commit()
        
        return True

# -----------------------------------------------------------------------------
# Project methods
    def create_project(self, user_id, name, description, is_private, tags):
        # Create project
        project = Project(
            name=name,
            description=description,
            is_private=is_private,
            user_id=user_id
        )
        
        self.session.add(project)
        self.session.flush()  # Get project ID before committing
        
        # Add tags (limit to 5)
        for tag_name in tags[:5]:
            tag = Tag(name=tag_name, project_id=project.id)
            self.session.add(tag)
        
        self.session.commit()
        return project.to_dict()
    
    def get_projects(self, user_id):
        # Get user's projects
        projects = self.session.query(Project).filter_by(user_id=user_id).all()
        return [project.to_dict() for project in projects]
    
    def get_project(self, project_id, user_id):
        # Get specific project if it belongs to the user
        project = self.session.query(Project).filter_by(id=project_id, user_id=user_id).first()
        if project:
            return project.to_dict()
        return None
    
    def update_project(self, project_id, user_id, data):
        project = self.session.query(Project).filter_by(id=project_id, user_id=user_id).first()
        if not project:
            return None
        
        # Update project fields
        if 'name' in data:
            project.name = data['name']
        if 'description' in data:
            project.description = data['description']
        if 'is_private' in data:
            project.is_private = data['is_private']
        
        # Update tags if provided
        if 'tags' in data:
            # Remove existing tags
            self.session.query(Tag).filter_by(project_id=project_id).delete()
            
            # Add new tags (limit to 5)
            for tag_name in data['tags'][:5]:
                tag = Tag(name=tag_name, project_id=project.id)
                self.session.add(tag)
        
        self.session.commit()
        return project.to_dict()
    
    def delete_project(self, project_id, user_id):
        project = self.session.query(Project).filter_by(id=project_id, user_id=user_id).first()
        if not project:
            return False
        
        self.session.delete(project)  # This will cascade delete associated tags
        self.session.commit()
        return True