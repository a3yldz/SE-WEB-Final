import { Navigate, Outlet } from 'react-router-dom';
import authService from '../services/authService';

interface ProtectedRouteProps {
    allowedRoles?: string[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
    const isAuthenticated = authService.isAuthenticated();
    const user = authService.getUser();

    if (!isAuthenticated) {
        // Redirect to login/auth screen if not authenticated
        return <Navigate to="/auth" replace />;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        // Redirect if user role is not allowed
        return <Navigate to="/" replace />; // Redirect to Dashboard or Map
    }

    // Render child routes if authenticated and authorized
    return <Outlet />;
};
