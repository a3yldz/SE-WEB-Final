import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Map, Upload, ShieldAlert, Menu, X, LogOut, User } from 'lucide-react';
import { cn } from '../lib/utils';
import authService from '../services/authService';

function getRoleBadgeStyles(role: string): string {
    switch (role) {
        case 'admin':
            return 'bg-purple-100 text-purple-700';
        case 'citizen':
            return 'bg-green-100 text-green-700';
        default:
            return 'bg-gray-100 text-gray-700';
    }
}

export function Navbar() {
    const [isOpen, setIsOpen] = React.useState(false);
    const [user, setUser] = useState(authService.getUser());
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const checkUser = () => setUser(authService.getUser());
        window.addEventListener('storage', checkUser);
        return () => window.removeEventListener('storage', checkUser);
    }, []);

    const handleLogout = () => {
        authService.logout();
        setUser(null);
        navigate('/auth');
    };

    const navigation = [
        { name: 'Home', href: '/', icon: Home },
        { name: 'Risk Map', href: '/map', icon: Map },
        { name: 'Analysis', href: '/upload', icon: Upload },
    ];

    if (user?.role === 'admin') {
        navigation.push({ name: 'Fire Dept', href: '/fire-dept', icon: ShieldAlert });
    }

    return (
        <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <span className="text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">
                                RescueApp
                            </span>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            {navigation.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.href}
                                        className={cn(
                                            "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200",
                                            isActive
                                                ? "border-red-500 text-gray-900"
                                                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                        )}
                                    >
                                        <Icon className="w-4 h-4 mr-2" />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* User Profile Section - Desktop */}
                    <div className="hidden sm:flex sm:items-center sm:space-x-4">
                        {user ? (
                            <div className="flex items-center space-x-3">
                                <div className="flex items-center space-x-2">
                                    <User className="w-5 h-5 text-gray-500" />
                                    <span className="text-sm font-medium text-gray-700">
                                        {user.full_name || user.email}
                                    </span>
                                    <span className={cn(
                                        "text-xs font-medium px-2 py-0.5 rounded-full capitalize",
                                        getRoleBadgeStyles(user.role)
                                    )}>
                                        {user.role}
                                    </span>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                                >
                                    <LogOut className="w-4 h-4 mr-1.5" />
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <Link
                                to="/auth"
                                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 shadow-sm transition-colors"
                            >
                                Login / Register
                            </Link>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <div className="-mr-2 flex items-center sm:hidden">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500"
                        >
                            <span className="sr-only">Open main menu</span>
                            {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            <div className={cn("sm:hidden", isOpen ? "block" : "hidden")}>
                <div className="pt-2 pb-3 space-y-1">
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                onClick={() => setIsOpen(false)}
                                className={cn(
                                    "block pl-3 pr-4 py-2 border-l-4 text-base font-medium",
                                    isActive
                                        ? "bg-red-50 border-red-500 text-red-700"
                                        : "border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"
                                )}
                            >
                                <div className="flex items-center">
                                    <Icon className="w-5 h-5 mr-3" />
                                    {item.name}
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* User Profile Section - Mobile */}
                <div className="pt-4 pb-3 border-t border-gray-200">
                    {user ? (
                        <div className="px-4 space-y-3">
                            <div className="flex items-center">
                                <User className="w-8 h-8 text-gray-400" />
                                <div className="ml-3">
                                    <div className="text-base font-medium text-gray-800">
                                        {user.full_name || user.email}
                                    </div>
                                    <span className={cn(
                                        "inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full capitalize",
                                        getRoleBadgeStyles(user.role)
                                    )}>
                                        {user.role}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    handleLogout();
                                }}
                                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Logout
                            </button>
                        </div>
                    ) : (
                        <div className="px-4">
                            <Link
                                to="/auth"
                                onClick={() => setIsOpen(false)}
                                className="block w-full text-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600"
                            >
                                Login / Register
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
