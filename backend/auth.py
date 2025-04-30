from models import *
from flask import session, jsonify
import jwt
import datetime
import os

DB_PATH = "db.sqlite"
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev_secret_key')

# Initialize database session
db = DBSession(DB_PATH)

class AuthController:
    def __init__(self):
        self.secret_key = SECRET_KEY
        self.token_expiration = 3600  # 1 hour
    
    def register(self, data):
        # Validate required fields
        required_fields = ['username', 'email', 'password']
        for field in required_fields:
            if field not in data:
                return {'error': f'Missing required field: {field}'}, 400
        
        # Register user in database
        user = db.register_user(data['username'], data['email'], data['password'])
        
        if not user:
            return {'error': 'Username or email already exists'}, 400
        
        # Generate JWT token
        token = self._generate_token(user['id'])
        
        return {
            'message': 'User registered successfully',
            'token': token,
            'user': user
        }, 201
    
    def login(self, data):
        # Validate required fields
        required_fields = ['email', 'password']
        for field in required_fields:
            if field not in data:
                return {'error': f'Missing required field: {field}'}, 400
        
        # Authenticate user
        user = db.authenticate_user(data['email'], data['password'])
        
        if not user:
            return {'error': 'Invalid email or password'}, 401
        
        # Generate JWT token
        token = self._generate_token(user['id'])
        
        return {
            'message': 'Login successful',
            'token': token,
            'user': user
        }, 200
    
    def get_current_user(self, token):
        try:
            # Decode JWT token
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
            
            # Check if token is expired
            if 'exp' in payload and datetime.datetime.utcnow() > datetime.datetime.fromtimestamp(payload['exp']):
                return {'error': 'Token has expired'}, 401
            
            # Get user from database
            user = db.get_user_by_id(user_id)
            
            if not user:
                return {'error': 'User not found'}, 404
            
            return {'user': user}, 200
            
        except jwt.InvalidTokenError:
            return {'error': 'Invalid token'}, 401
        except Exception as e:
            return {'error': f'Token validation error: {str(e)}'}, 500
    
    def _generate_token(self, user_id):
        # Set token expiration time
        now = datetime.datetime.now(datetime.UTC)
        
        # Create JWT payload
        payload = {
            'sub': str(user_id),  # Convert ID to string to ensure compatibility
            'iat': int(now.timestamp()),  # Convert to integer timestamp
            'exp': int((now + datetime.timedelta(days=1)).timestamp())  # Convert to integer timestamp
        }
        
        # Generate token
        token = jwt.encode(payload, self.secret_key, algorithm='HS256')
        
        return token 