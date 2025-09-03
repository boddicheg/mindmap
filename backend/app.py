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

# User routes
@app.route('/api/user/profile', methods=['GET'])
@token_required
def get_user_profile():
    return jsonify(request.current_user), 200

@app.route('/api/user/update-email', methods=['PUT'])
@token_required
def update_email():
    data = request.get_json()
    if 'email' not in data:
        return jsonify({'error': 'Email is required'}), 400
        
    user_id = request.current_user['id']
    from auth import db
    
    success, message = db.update_user_email(user_id, data['email'])
    
    if not success:
        return jsonify({'error': message}), 400
        
    # Get updated user data
    user = db.get_user_by_id(user_id)
    
    return jsonify({'message': 'Email updated successfully', 'user': user}), 200

@app.route('/api/user/delete-account', methods=['DELETE'])
@token_required
def delete_account():
    user_id = request.current_user['id']
    from auth import db
    
    success = db.delete_user(user_id)
    
    if not success:
        return jsonify({'error': 'Failed to delete account'}), 500
        
    return jsonify({'message': 'Account deleted successfully'}), 200

# Project routes
@app.route('/api/projects', methods=['GET'])
@token_required
def get_projects():
    user_id = request.current_user['id']
    from auth import db
    projects = db.get_projects(user_id)
    return jsonify(projects)

@app.route('/api/projects/<int:project_id>/flow', methods=['GET'])
@token_required
def get_project_flow(project_id):
    user_id = request.current_user['id']
    from auth import db
    
    flow_data = db.get_project_flow(project_id, user_id)
    
    if not flow_data:
        return jsonify({'flow': None}), 200
        
    return jsonify(flow_data)

@app.route('/api/projects/<int:project_id>/flow', methods=['POST'])
@token_required
def save_project_flow(project_id):
    user_id = request.current_user['id']
    data = request.get_json()
    
    if 'flow' not in data:
        return jsonify({'error': 'Flow data is required'}), 400
        
    from auth import db
    success, message = db.save_project_flow(project_id, user_id, data['flow'])
    
    if not success:
        return jsonify({'error': message}), 400
        
    return jsonify({'message': message}), 200

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

# Image upload route
@app.route('/api/upload-image', methods=['POST'])
@token_required
def upload_image():
    user_id = request.current_user['id']
    data = request.get_json()
    
    if 'nodeId' not in data or 'imageData' not in data:
        return jsonify({'error': 'nodeId and imageData are required'}), 400
    
    node_id = data['nodeId']
    image_data = data['imageData']
    
    # Validate base64 image data
    if not image_data.startswith('data:image/'):
        return jsonify({'error': 'Invalid image data format'}), 400
    
    # Store image in database
    from auth import db
    success, message = db.save_node_image(user_id, node_id, image_data)
    
    if not success:
        return jsonify({'error': message}), 400
    
    return jsonify({'message': 'Image uploaded successfully', 'imageData': image_data}), 200

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