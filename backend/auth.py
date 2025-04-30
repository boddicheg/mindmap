from models import *
from flask import session, jsonify
import jwt
import datetime
import os

DB_PATH = "db.sqlite"
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev_secret_key')

class AuthController:
    def __init__(self) -> None:
        self.database = DBSession(DB_PATH)
    
    def register(self, data):
        # Validate input
        required_fields = ['username', 'email', 'password']
        for field in required_fields:
            if field not in data:
                return {"error": f"Missing required field: {field}"}, 400
        
        # Register user
        user = self.database.register_user(
            username=data['username'],
            email=data['email'],
            password=data['password']
        )
        
        if not user:
            return {"error": "Username or email already exists"}, 409
        
        # Generate token
        token = self._generate_token(user)
        
        return {
            "message": "User registered successfully",
            "user": user,
            "token": token
        }, 201
    
    def login(self, data):
        # Validate input
        if 'email' not in data or 'password' not in data:
            return {"error": "Email and password are required"}, 400
        
        # Authenticate user
        user = self.database.authenticate_user(
            email=data['email'],
            password=data['password']
        )
        
        if not user:
            return {"error": "Invalid email or password"}, 401
        
        # Generate token
        token = self._generate_token(user)
        
        return {
            "message": "Login successful",
            "user": user,
            "token": token
        }, 200
    
    def get_current_user(self, token):
        try:
            # Decode token
            print(f"Token: {token}")
            # Add options to handle the datetime format
            payload = jwt.decode(
                token, 
                SECRET_KEY, 
                algorithms=['HS256'],
                options={"verify_signature": True}
            )
            user_id = int(payload['sub'])  # Convert string ID back to integer
            print(f"User ID: {user_id}")
            
            # Get user
            user = self.database.get_user_by_id(user_id)
            
            if not user:
                return {"error": "User not found"}, 404
            
            return {"user": user}, 200
            
        except jwt.ExpiredSignatureError:
            print("Token expired")
            return {"error": "Token expired"}, 401
        except jwt.InvalidTokenError as e:
            print(f"Invalid token error: {str(e)}")
            return {"error": "Invalid token"}, 401
        except ValueError as e:
            print(f"Value error: {str(e)}")
            return {"error": "Invalid token format"}, 401
    
    def _generate_token(self, user):
        now = datetime.datetime.now(datetime.UTC)
        payload = {
            'sub': str(user['id']),  # Convert ID to string to ensure compatibility
            'iat': int(now.timestamp()),  # Convert to integer timestamp
            'exp': int((now + datetime.timedelta(days=1)).timestamp())  # Convert to integer timestamp
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
        print(f"Generated token: {token[:20]}...")
        return token 