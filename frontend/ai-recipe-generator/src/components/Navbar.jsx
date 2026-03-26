import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Calendar,
    ChefHat,
    ChevronDown,
    Home,
    LogOut,
    Settings,
    ShoppingCart,
    Sparkles,
    User,
    UtensilsCrossed
} from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const handleLogout = () => {
        logout();
        setIsDropdownOpen(false);
        navigate('/login');
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        setIsDropdownOpen(false);
    }, [location.pathname]);

    return (
        <nav className="sticky top-0 z-50 border-b border-emerald-700/40 bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/15 backdrop-blur">
            <div className="mx-auto max-w-[88rem] px-4 sm:px-6 lg:px-8">
                <div className="flex min-h-[4.5rem] items-center justify-between py-2">
                    <Link to="/dashboard" className="flex items-center gap-3 text-white">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/18 text-white shadow-sm ring-1 ring-white/20">
                            <ChefHat className="h-6 w-6" />
                        </div>
                        <div className="hidden sm:block">
                            <div className="text-base font-semibold leading-tight">AI Recipe Generator</div>
                            <div className="text-xs font-medium text-emerald-50/90">Plan. Cook. Repeat.</div>
                        </div>
                    </Link>

                    <div className="hidden items-center gap-1 rounded-2xl border border-white/15 bg-white/10 p-1.5 backdrop-blur-sm md:flex">
                        <NavLink to="/dashboard" icon={<Home className="h-4 w-4" />} label="Dashboard" />
                        <NavLink to="/pantry" icon={<UtensilsCrossed className="h-4 w-4" />} label="Pantry" />
                        <NavLink to="/generate" icon={<ChefHat className="h-4 w-4" />} label="Generate" />
                        <NavLink to="/recipes" icon={<Sparkles className="h-4 w-4" />} label="Recipes" />
                        <NavLink to="/meal-plan" icon={<Calendar className="h-4 w-4" />} label="Meal Plan" />
                        <NavLink to="/shopping-list" icon={<ShoppingCart className="h-4 w-4" />} label="Shopping" />
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            to="/settings"
                            className="rounded-xl p-2 text-white/90 transition-colors hover:bg-white/12 hover:text-white"
                            aria-label="Open settings"
                        >
                            <Settings className="h-5 w-5" />
                        </Link>

                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsDropdownOpen((open) => !open)}
                                className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white shadow-sm backdrop-blur-sm transition hover:bg-white/16"
                                aria-expanded={isDropdownOpen}
                                aria-haspopup="menu"
                            >
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/18 text-sm font-semibold text-white ring-1 ring-white/20">
                                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div className="hidden text-left sm:block">
                                    <p className="max-w-32 truncate font-medium text-white">{user?.name || 'User'}</p>
                                    <p className="max-w-32 truncate text-xs text-emerald-50/85">{user?.email || 'Signed in'}</p>
                                </div>
                                <ChevronDown className={`h-4 w-4 text-emerald-50/90 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isDropdownOpen && (
                                <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl shadow-emerald-100/40" role="menu">
                                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-4 text-white">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-base font-semibold">
                                                {user?.name?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold">{user?.name || 'User'}</p>
                                                <p className="truncate text-xs text-emerald-50/90">{user?.email || 'user@example.com'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-2">
                                        <MenuLink
                                            to="/dashboard"
                                            icon={<Home className="h-4 w-4" />}
                                            label="Dashboard"
                                            description="Overview, stats, and quick actions"
                                        />
                                        <MenuLink
                                            to="/recipes"
                                            icon={<Sparkles className="h-4 w-4" />}
                                            label="My Recipes"
                                            description="Browse saved dishes and favorites"
                                        />
                                        <MenuLink
                                            to="/settings"
                                            icon={<User className="h-4 w-4" />}
                                            label="Profile & Settings"
                                            description="Update your account and preferences"
                                        />
                                    </div>

                                    <div className="border-t border-gray-100 p-2">
                                        <button
                                            onClick={handleLogout}
                                            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-red-600 transition hover:bg-red-50"
                                        >
                                            <LogOut className="h-4 w-4" />
                                            <div>
                                                <p className="font-medium">Log Out</p>
                                                <p className="text-xs text-red-400">End this session on this device</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

const NavLink = ({ to, icon, label }) => {
    return (
        <Link
            to={to}
            className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-white/14 hover:text-white"
        >
            {icon}
            <span>{label}</span>
        </Link>
    );
};

const MenuLink = ({ to, icon, label, description }) => {
    return (
        <Link
            to={to}
            className="mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-gray-700 transition hover:bg-emerald-50 hover:text-emerald-700"
        >
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                {icon}
            </div>
            <div>
                <p className="font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">{description}</p>
            </div>
        </Link>
    );
};

export default Navbar;
