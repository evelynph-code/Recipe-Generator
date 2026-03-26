import { useState, useEffect } from 'react';
import { User, Lock, Trash2, Save, Mail, SlidersHorizontal } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../services/api'

const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Paleo'];
const CUISINES = ['Any', 'Italian', 'Mexican', 'Indian', 'Chinese', 'Vietnamese', 'Japanese', 'Thai', 'French', 'Russian', 'Mediterranean', 'American'];

const Settings = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    // Profile state
    const [profile, setProfile] = useState({
        name: '',
        email: ''
    });

    // Preferences state
    const [preferences, setPreferences] = useState({
        dietary_restrictions: [],
        allergies: [],
        preferred_cuisines: [],
        default_servings: 4,
        measurement_unit: 'metric'
    });

    // Password state
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        fetchUserData();
    }, [user]);

    const fetchUserData = async () => {
        try {
            const response = await api.get('/users/profile')
            const {user, preferences: userPrefs} = response.data.data;

            setProfile({
                name: user.name,
                email: user.email
            })

            if (userPrefs) {
                setPreferences({
                    dietary_restrictions: userPrefs.dietary_restrictions || [],
                    allergies: userPrefs.allergies || [],
                    preferred_cuisines: userPrefs.preferred_cuisines || [],
                    default_servings: userPrefs.default_servings || 4,
                    measurement_unit: userPrefs.measurement_unit || 'metric'
                })
            }
        } catch (error) {
            toast.error('Failed to load user data')
        } finally {
            setLoading(false)
        }
    }

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            await api.put('/users/profile', profile)
            toast.success('Profile updated successfully');

            //Update local storage
            const updatedUser = {...user, ...profile}
            localStorage.setItem('user', JSON.stringify(updatedUser));
        } catch (error) {
            toast.error('Failed to update profile')
        } finally {
            setSaving(false);
        }
    };

    const handlePreferencesUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            await api.put('/users/preferences', preferences);
            toast.success('Preferences updated successfully');
        } catch (error) {
            toast.error('Failed to update preferences')
        } finally {
            setSaving(false)
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (passwordData.newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

       setSaving(true)

        try {
            await api.put('/users/change-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            })
            toast.success('Password changed successfully')
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to change password');
        } finally {
            setSaving(false)
        }
    };

    const handleDeleteAccount = async () => {
        if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            return;
        }

        const confirmation = prompt('Type "DELETE" to confirm account deletion:');
        if (confirmation !== 'DELETE') {
            toast.error('Account deletion cancelled');
            return;
        }

        try {
            await api.delete('/users/account');
            toast.success('Account deleted successfully')
            logout();
            navigate('/login');
        } catch (error) {
            toast.error('Faled to delete account');
        }
    };

    const toggleDietary = (option) => {
        setPreferences(prev => ({
            ...prev,
            dietary_restrictions: prev.dietary_restrictions.includes(option)
                ? prev.dietary_restrictions.filter(d => d !== option)
                : [...prev.dietary_restrictions, option]
        }));
    };

    const toggleCuisine = (cuisine) => {
        setPreferences(prev => ({
            ...prev,
            preferred_cuisines: prev.preferred_cuisines.includes(cuisine)
                ? prev.preferred_cuisines.filter(c => c !== cuisine)
                : [...prev.preferred_cuisines, cuisine]
        }));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="flex items-center justify-center h-96">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
            <Navbar />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8 overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
                    <div className="bg-gradient-to-r from-emerald-500 via-emerald-500 to-teal-500 px-6 py-8 text-white">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm font-medium text-emerald-50/90">Account hub</p>
                                <h1 className="mt-1 text-3xl font-bold text-white">Settings</h1>
                                <p className="mt-2 max-w-2xl text-sm text-emerald-50/90">
                                    Keep your profile, food preferences, and account security in one clean place.
                                </p>
                            </div>
                            <div className="flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-lg font-semibold">
                                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div>
                                    <p className="font-semibold">{user?.name || 'User'}</p>
                                    <p className="text-sm text-emerald-50/90">{user?.email || 'Signed in account'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 border-t border-emerald-100 bg-white px-6 py-5 sm:grid-cols-3">
                        <InfoTile icon={<User className="h-4 w-4" />} label="Profile" value={profile.name || 'Set your name'} />
                        <InfoTile icon={<Mail className="h-4 w-4" />} label="Email" value={profile.email || 'No email available'} />
                        <InfoTile icon={<SlidersHorizontal className="h-4 w-4" />} label="Default Servings" value={`${preferences.default_servings} portions`} />
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Profile Section */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                <User className="w-5 h-5 text-emerald-600" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
                        </div>

                        <form onSubmit={handleProfileUpdate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                                <input
                                    type="text"
                                    value={profile.name}
                                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={profile.email}
                                    disabled
                                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {saving ? 'Saving...' : 'Save Profile'}
                            </button>
                        </form>
                    </div>


                    {/* Change Password Section */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Lock className="w-5 h-5 text-blue-600" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>
                        </div>

                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                                <input
                                    type="password"
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                                <input
                                    type="password"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                <Lock className="w-4 h-4" />
                                {saving ? 'Changing...' : 'Change Password'}
                            </button>
                        </form>
                    </div>

                    {/* Preferences Section */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-6">Dietary Preferences</h2>

                        <form onSubmit={handlePreferencesUpdate} className="space-y-6">
                            {/* Dietary Restrictions */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">Dietary Restrictions</label>
                                <div className="flex flex-wrap gap-2">
                                    {DIETARY_OPTIONS.map(option => (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => toggleDietary(option)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${preferences.dietary_restrictions.includes(option)
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Allergies */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Allergies (comma-separated)</label>
                                <input
                                    type="text"
                                    value={preferences.allergies.join(', ')}
                                    onChange={(e) => setPreferences({
                                        ...preferences,
                                        allergies: e.target.value.split(',').map(a => a.trim()).filter(Boolean)
                                    })}
                                    placeholder="e.g., peanuts, shellfish, soy"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                />
                            </div>

                            {/* Preferred Cuisines */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">Preferred Cuisines</label>
                                <div className="flex flex-wrap gap-2">
                                    {CUISINES.map(cuisine => (
                                        <button
                                            key={cuisine}
                                            type="button"
                                            onClick={() => toggleCuisine(cuisine)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${preferences.preferred_cuisines.includes(cuisine)
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            {cuisine}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Default Servings */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Default Servings: {preferences.default_servings}
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="12"
                                    value={preferences.default_servings}
                                    onChange={(e) => setPreferences({ ...preferences, default_servings: parseInt(e.target.value) })}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>1</span>
                                    <span>12</span>
                                </div>
                            </div>

                            {/* Measurement Unit */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Measurement Unit</label>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setPreferences({ ...preferences, measurement_unit: 'metric' })}
                                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${preferences.measurement_unit === 'metric'
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        Metric (kg, L)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPreferences({ ...preferences, measurement_unit: 'imperial' })}
                                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${preferences.measurement_unit === 'imperial'
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        Imperial (lb, gal)
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {saving ? 'Saving...' : 'Save Preferences'}
                            </button>
                        </form>
                    </div>


                    {/* Danger Zone */}
                    <div className="bg-white rounded-xl border border-red-200 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                <Trash2 className="w-5 h-5 text-red-600" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900">Danger Zone</h2>
                        </div>

                        <p className="text-gray-600 mb-4">
                            Once you delete your account, there is no going back. All your recipes, meal plans, and data will be permanently deleted.
                        </p>

                        <button
                            onClick={handleDeleteAccount}
                            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;

const InfoTile = ({ icon, label, value }) => {
    return (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                {icon}
                <span>{label}</span>
            </div>
            <p className="truncate text-sm font-semibold text-gray-900">{value}</p>
        </div>
    );
};
