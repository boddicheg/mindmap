# Mindmaps - Interactive Mind Mapping Application

A full-stack mind mapping application with React frontend and Rust/Python backend options.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+)
- Rust (latest stable)
- Python 3.8+ (optional, for Python backend)

### Installation
```bash
npm run install:all
```

## 🏃‍♂️ Development

### Start with Rust Backend (Recommended)
```bash
npm start
# or explicitly
npm run start:rust
```

### Start with Python Backend
```bash
npm run start:python
```

This will start both the frontend (Vite dev server) and backend concurrently with colored output.

## 📋 Available Scripts

### Main Commands
- `npm start` - Start frontend + Rust backend (default)
- `npm run start:rust` - Start frontend + Rust backend  
- `npm run start:python` - Start frontend + Python backend

### Frontend Only
- `npm run frontend:dev` - Start Vite dev server
- `npm run frontend:build` - Build for production
- `npm run frontend:build:watch` - Build with watch mode

### Backend Only
- `npm run backend:rust` - Start Rust backend (debug mode)
- `npm run backend:rust:release` - Start Rust backend (release mode)
- `npm run backend:python` - Start Python Flask backend

### Testing
- `npm run test:backend` - Run comprehensive backend tests (bash)
- `npm run test:backend:simple` - Run simple backend tests (Python)

### Utilities
- `npm run install:all` - Install all dependencies
- `npm run build` - Build frontend for production
- `npm run clean` - Clean all build artifacts

## 🏗️ Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI**: Tailwind CSS + Headless UI
- **Diagram Engine**: React Flow (@xyflow/react)
- **Routing**: React Router DOM

### Backend Options

#### Rust Backend (Recommended)
- **Framework**: Axum 0.6
- **Database**: SQLite with SQLx
- **Authentication**: JWT with bcrypt
- **Performance**: ~10x faster than Python
- **Location**: `backend-rust/`

#### Python Backend (Legacy)
- **Framework**: Flask
- **Database**: SQLite with SQLAlchemy
- **Authentication**: JWT with bcrypt
- **Location**: `backend/`

## 🌟 Features

- **User Authentication** - Registration, login, JWT tokens
- **Project Management** - Create, edit, delete projects with tags
- **Interactive Diagrams** - React Flow-based mind maps
- **Custom Nodes** - Note and Image nodes with editing
- **Flow Persistence** - Save/load diagram state
- **Image Upload** - Base64 image storage
- **Dark/Light Mode** - Theme switching
- **Export** - Download diagrams as images

## 🔧 Development Setup

1. **Clone and install**:
   ```bash
   git clone <repo>
   cd mindmaps
   npm run install:all
   ```

2. **Start development**:
   ```bash
   npm start  # Rust backend + frontend
   ```

3. **Access the application**:
   - Frontend: http://localhost:5173 (Vite dev server)
   - Backend: http://localhost:1337 (API endpoints)

## 🧪 Testing

The project includes comprehensive test suites:

```bash
# Test all API endpoints
npm run test:backend

# Simple compatibility test
npm run test:backend:simple
```

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/update-email` - Update email
- `DELETE /api/user/delete-account` - Delete account

### Projects
- `GET /api/projects` - List user projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Project Flows
- `GET /api/projects/:id/flow` - Get flow data
- `POST /api/projects/:id/flow` - Save flow data

### Images
- `POST /api/upload-image` - Upload node image

## 🚀 Production Deployment

### Build Frontend
```bash
npm run build
```

### Run Rust Backend (Production)
```bash
npm run backend:rust:release
```

The built frontend will be served by the Rust backend at the same port (1337).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Run tests: `npm run test:backend`
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details
