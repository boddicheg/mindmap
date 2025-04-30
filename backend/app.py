from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
import mimetypes
import os
import functools
from auth import AuthController
# Very important "fix" for sending js as text/javascript, not like text/plain
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('text/javascript', '.js')

template_dir = os.path.abspath('../app/dist')
print(template_dir)
app = Flask(__name__, template_folder=template_dir, static_folder=template_dir + '/assets')
CORS(app)
g_auth = AuthController()

# Authentication middleware
def token_required(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        print(f"Auth header: {auth_header}")
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            print(f"Extracted token: {token[:20]}...")
            
        if not token:
            return jsonify({"error": "Authentication token is missing"}), 401
            
        result, status_code = g_auth.get_current_user(token)
        
        if status_code != 200:
            return jsonify(result), status_code
            
        # Add user to request context
        request.current_user = result['user']
        return f(*args, **kwargs)
        
    return decorated

@app.route('/', methods=['GET'])
def index():
    return render_template(f'index.html')

# Authentication routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    result, status_code = g_auth.register(data)
    return jsonify(result), status_code

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    result, status_code = g_auth.login(data)
    return jsonify(result), status_code

@app.route('/api/projects', methods=['GET'])
@token_required
def get_projects():
    # Dummy data for now
    projects = [
        {
            'id': '1',
            'name': 'Test Project',
            'description': 'A test project',
            'updatedAt': '2024-03-20',
            'imageCount': 197,
            'modelCount': 1
        }
    ]
    return jsonify(projects)

if __name__ == '__main__':
    print("Starting server on port 1337")
    app.run(debug=True, host='127.0.0.1', port=1337, use_reloader=True)