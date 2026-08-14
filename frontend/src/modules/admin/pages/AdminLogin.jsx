import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import toast from 'react-hot-toast';
import { authAPI } from '../../../api/auth.api';
import { STORAGE_KEYS } from '../../../config/constants';
import { useApp } from '../../customer/context/AppContext';
import CleanCard from '../../../components/auth/CleanCard';
import CleanInput from '../../../components/auth/CleanInput';
import CleanButton from '../../../components/auth/CleanButton';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!email.trim()) {
      setError('Email is required');
      toast.error('Email is required');
      return;
    }

    if (!password.trim()) {
      setError('Password is required');
      toast.error('Password is required');
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    console.log('🔐 Admin Login Attempt:', { email, timestamp: new Date().toISOString() });

    try {
      console.log('📡 Calling authAPI.adminLogin...');
      const response = await authAPI.adminLogin(email, password);
      console.log('✅ Login Response:', response);

      if (response && response.success && response.token) {
        console.log('💾 Storing credentials...');
        
        // Store token FIRST (important for axios interceptor)
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.token);
        console.log('✅ Token stored:', response.token.substring(0, 20) + '...');
        
        // Then store user data
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(response.user));
        console.log('✅ User data stored:', response.user);

        // Update app context
        login(response.user);
        console.log('✅ Context updated');

        toast.success('Welcome back, Admin!', { duration: 3000 });
        
        // Navigate immediately
        console.log('🚀 Navigating to /admin...');
        navigate('/admin', { replace: true });
      } else {
        console.error('❌ Invalid response structure:', response);
        setError('Invalid response from server');
        toast.error('Login failed. Please try again.');
      }
    } catch (error) {
      console.error('❌ Admin login error:', error);
      console.error('Error details:', {
        message: error?.message,
        error: error?.error,
        response: error?.response,
        stack: error?.stack
      });
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (error?.error) {
        errorMessage = error.error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      setError(errorMessage);
      toast.error(errorMessage, { duration: 4000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex items-center justify-center p-6">
      <div className="w-full max-w-6xl flex flex-col md:flex-row items-center gap-12">
        
        {/* Left Side - Hero Text (Hidden on Mobile) */}
        <div className="hidden md:flex md:w-1/2 flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mb-6">
              <SecurityRoundedIcon sx={{ fontSize: 32 }} className="text-primary-700" />
            </div>
            
            <h1 className="text-5xl font-bold text-gray-900 mb-4 leading-tight">
              Total Control.<br />
              <span className="text-primary-700">Ultimate Visibility.</span>
            </h1>
            
            <p className="text-lg text-gray-600 leading-relaxed max-w-md">
              Securely manage merchants, subscriptions, and platform analytics from your command center.
            </p>

            <div className="mt-8 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-primary-700" />
                </div>
                <span className="text-gray-600">Merchant approval & management</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-primary-700" />
                </div>
                <span className="text-gray-600">Real-time analytics dashboard</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-primary-700" />
                </div>
                <span className="text-gray-600">Subscription & payment tracking</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full md:w-1/2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Mobile Header */}
            <div className="md:hidden text-center mb-8">
              <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <SecurityRoundedIcon sx={{ fontSize: 32 }} className="text-primary-700" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Offerly Control Center</h1>
              <p className="text-xs font-semibold text-primary-700 uppercase tracking-wider mt-1">Admin Access Only</p>
            </div>

            <CleanCard title="Offerly — Admin Access" showHeader={false}>
              <div className="p-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">Admin Login</h2>
                  <p className="text-sm text-gray-600">Enter your credentials to access the secure dashboard</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-red-600 text-xs font-bold">!</span>
                      </div>
                      <p className="text-sm text-red-700 font-medium">{error}</p>
                    </div>
                  )}

                  {/* Email */}
                  <CleanInput
                    label="System Email"
                    icon={EmailRoundedIcon}
                    type="email"
                    placeholder="admin@offerly.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    autoComplete="email"
                    disabled={loading}
                  />

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Master Password
                    </label>
                    <div className="relative">
                      <LockRoundedIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" sx={{ fontSize: 20 }} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setError('');
                        }}
                        placeholder="••••••••"
                        className="w-full h-12 bg-[#FAFBFC] border border-gray-200 rounded-lg pl-12 pr-12 text-[15px] text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primary-700 focus:ring-4 focus:ring-primary-700/10 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        autoComplete="current-password"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors p-1"
                      >
                        {showPassword ? <VisibilityOffRoundedIcon sx={{ fontSize: 20 }} /> : <VisibilityRoundedIcon sx={{ fontSize: 20 }} />}
                      </button>
                    </div>
                  </div>

                  {/* Submit */}
                  <CleanButton
                    type="submit"
                    disabled={loading}
                    loading={loading}
                    className="w-full"
                  >
                    {loading ? 'Authenticating...' : 'Access Dashboard'}
                  </CleanButton>

                  {/* Debug Info (Development Only) */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-xs font-bold text-gray-600 mb-2">🔧 Development Credentials:</p>
                      <div className="space-y-1 text-xs text-gray-600">
                        <p><span className="font-semibold">Email:</span> admin@offerly.com</p>
                        <p><span className="font-semibold">Password:</span> Admin@123</p>
                        <p className="text-[10px] text-gray-500 mt-2">
                          Note: If these don't work, check database seeding
                        </p>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </CleanCard>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
