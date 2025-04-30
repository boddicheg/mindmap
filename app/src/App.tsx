import "./index.css";
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Projects from './pages/Projects';
import Project from './pages/Project';
import Login from './pages/Login';
import Register from './pages/Register';
import Settings from './pages/Settings';
import ProtectedRoute from './components/ProtectedRoute';
import { useEffect } from "react";
import authService from './services/authService';
// import Project from './pages/Project';

function App() {
  useEffect(() => {
    console.log("App initialized");
  }, []);

  // Check if user is authenticated
  const isAuthenticated = authService.isAuthenticated();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/" replace /> : <Login />
        } />
        <Route path="/register" element={
          isAuthenticated ? <Navigate to="/" replace /> : <Register />
        } />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={
            <div className="flex h-screen bg-gray-100">
              <Sidebar />
              <div className="flex-1 overflow-auto">
                <Projects />
              </div>
            </div>
          } />
          <Route path="/settings" element={
            <div className="flex h-screen bg-gray-100">
              <Sidebar />
              <div className="flex-1 overflow-auto">
                <Settings />
              </div>
            </div>
          } />
          <Route path="/project/:projectId" element={
            <div className="flex h-screen bg-gray-100">
              <Sidebar />
              <div className="flex-1 overflow-auto">
                <Project />
              </div>
            </div>
          } />
          {/* Add more protected routes as needed */}
          <Route element={<ProtectedRoute />}>
          <Route path="/projects" element={
            <div className="flex h-screen bg-gray-100">
              <Sidebar />
              <div className="flex-1 overflow-auto">
                <Projects />
              </div>
            </div>
          } />
          {/* Add more protected routes as needed */}
        </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
