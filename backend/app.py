from flask import Flask, jsonify, render_template
from flask_cors import CORS
import mimetypes
import os
# Very important "fix" for sending js as text/javascript, not like text/plain
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('text/javascript', '.js')

template_dir = os.path.abspath('../app/dist')
print(template_dir)
app = Flask(__name__, template_folder=template_dir, static_folder=template_dir + '/assets')
CORS(app)

@app.route('/', methods=['GET'])
def index():
    return render_template(f'index.html')

@app.route('/api/projects', methods=['GET'])
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