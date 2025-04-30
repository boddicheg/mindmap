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

# Project routes
@app.route('/api/projects', methods=['GET'])
@token_required
def get_projects():
    user_id = request.current_user['id']
    from auth import db
    projects = db.get_projects(user_id)
    return jsonify(projects)

@app.route('/api/projects', methods=['POST'])
@token_required
def create_project():
    user_id = request.current_user['id']
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['name']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    # Process tags
    tags = []
    if 'tags' in data and data['tags']:
        tags = [tag.strip() for tag in data['tags'].split(',') if tag.strip()]
    
    from auth import db
    project = db.create_project(
        user_id=user_id,
        name=data['name'],
        description=data.get('description', ''),
        is_private=data.get('is_private', False),
        tags=tags
    )
    
    return jsonify(project), 201

@app.route('/api/projects/<int:project_id>', methods=['GET'])
@token_required
def get_project(project_id):
    user_id = request.current_user['id']
    from auth import db
    project = db.get_project(project_id, user_id)
    
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    
    return jsonify(project)

@app.route('/api/projects/<int:project_id>', methods=['PUT'])
@token_required
def update_project(project_id):
    user_id = request.current_user['id']
    data = request.get_json()
    
    # Process tags if provided
    if 'tags' in data and isinstance(data['tags'], str):
        data['tags'] = [tag.strip() for tag in data['tags'].split(',') if tag.strip()]
    
    from auth import db
    project = db.update_project(project_id, user_id, data)
    
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    
    return jsonify(project)

@app.route('/api/projects/<int:project_id>', methods=['DELETE'])
@token_required
def delete_project(project_id):
    user_id = request.current_user['id']
    from auth import db
    success = db.delete_project(project_id, user_id)
    
    if not success:
        return jsonify({'error': 'Project not found'}), 404
    
    return jsonify({'message': 'Project deleted successfully'}), 200

# Catch all route to handle client-side routing
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    # Properly handle API paths - they should be handled by their own routes, not caught here
    if path and path.startswith('api'):
        return jsonify({"error": "API endpoint not found"}), 404
    return render_template('index.html')

if __name__ == '__main__':
    print("Starting server on port 1337")
    app.run(debug=True, host='127.0.0.1', port=1337, use_reloader=True)