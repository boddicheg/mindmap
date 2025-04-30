import { Navigate, Outlet } from 'react-router-dom';
import authService from '../services/authService';

const ProtectedRoute = () => {
  const isAuthenticated = authService.isAuthenticated();
  
  if (!isAuthenticated) {
    // Redirect to the login page if not authenticated
    return <Navigate to="/login" replace />;
  }

  // Render the child routes
  return <Outlet />;
};

export default ProtectedRoute; 