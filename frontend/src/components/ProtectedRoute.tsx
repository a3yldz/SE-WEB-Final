import { Navigate, Outlet } from 'react-router-dom';
import authService from '../services/authService';

interface ProtectedRouteProps {
    allowedRoles?: string[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
    const isAuthenticated = authService.isAuthenticated();
    const user = authService.getUser();

    if (!isAuthenticated) {
        return <Navigate to="/auth" replace />;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};
