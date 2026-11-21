import React, { useState } from 'react';
import {
  User,
  Lock,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Globe,
  Phone,
  Mail,
  Headphones,
  Copy,
  Check,
  ShieldCheck,
  UserPlus,
  LogIn,
  CheckCircle2,
  Briefcase
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth, RegisterPayload } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { AnayaCraftEmblem, AnayaCraftLogo } from '../Common/AnayaCraftLogo';
import ThemeSwitcher from '../Common/ThemeSwitcher';

// Dedicated Official WhatsApp Vector Icon
function WhatsAppIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export const LoginPage: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const { login, register } = useAuth();
  
  // Mode: 'login' or 'register' or 'reset'
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');

  // Login form state (empty by default - no shortcuts)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('cashier');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Reset password form state
  const [resetUsername, setResetUsername] = useState('');
  const [resetPhone, setResetPhone] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Support Contacts
  const supportPhone = '+977 98510 87654';
  const supportPhoneClean = supportPhone.replace(/[^0-9+]/g, '');
  const supportEmail = 'support@anacraft.com';
  const whatsAppLink = `https://wa.me/9779851087654?text=${encodeURIComponent(
    language === 'en'
      ? 'Hello Anaya Craft Support, I need assistance with Nepal Iron Store ERP 2.0.'
      : 'नमस्ते Anaya Craft Support, मलाई नेपाल फलाम तथा स्टिल ईआरपी २.० मा सहायता चाहिएको छ ।'
  )}`;

  const handleCopySupportInfo = () => {
    const text = `Customer Support - Anaya Craft Nepal Iron Store ERP 2.0\nPhone: ${supportPhone}\nWhatsApp: ${supportPhone}\nEmail: ${supportEmail}\nPortal: https://anacraft.com`;
    try {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  // Sign in handler
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError(language === 'np' ? 'कृपया प्रयोगकर्ता नाम र पासवर्ड राख्नुहोस् ।' : 'Please enter your login ID and password.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const res = await login(username.trim(), password.trim());
    if (!res.success) {
      setError(res.message || (language === 'np' ? 'लगइन असफल भयो । कृपया सही विवरण राख्नुहोस् ।' : 'Invalid username or password.'));
      setLoading(false);
    }
  };

  // Registration handler
  const handleRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanName = regFullName.trim();
    const cleanUser = regUsername.trim().toLowerCase();
    const cleanPhone = regPhone.trim();
    const cleanPass = regPassword.trim();
    const cleanConfirm = regConfirmPassword.trim();

    if (!cleanName) {
      setError(language === 'np' ? 'कृपया पूरा नाम राख्नुहोस् ।' : 'Please enter your full name.');
      return;
    }
    if (!cleanUser) {
      setError(language === 'np' ? 'कृपया प्रयोगकर्ता नाम (Login ID) राख्नुहोस् ।' : 'Please enter a username / Login ID.');
      return;
    }
    if (cleanUser.length < 3) {
      setError(language === 'np' ? 'प्रयोगकर्ता नाम कम्तिमा ३ अक्षरको हुनुपर्छ ।' : 'Username must be at least 3 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUser)) {
      setError(language === 'np' ? 'प्रयोगकर्ता नाममा अक्षर, अंक, र underscore मात्र हुनुपर्छ ।' : 'Username can only contain letters, numbers, and underscores.');
      return;
    }
    if (!cleanPass) {
      setError(language === 'np' ? 'कृपया पासवर्ड राख्नुहोस् ।' : 'Please enter a password.');
      return;
    }
    if (cleanPass.length < 4) {
      setError(language === 'np' ? 'पासवर्ड कम्तिमा ४ अक्षरको हुनुपर्छ ।' : 'Password must be at least 4 characters long.');
      return;
    }
    if (cleanPass !== cleanConfirm) {
      setError(language === 'np' ? 'पासवर्ड र पुष्टि पासवर्ड मिलेन ।' : 'Passwords do not match.');
      return;
    }

    if (cleanPhone && cleanPhone.length !== 10) {
      setError(language === 'np' ? 'सम्पर्क फोन नम्बर ठ्याक्कै १० अंकको हुनुपर्छ ।' : 'Phone number must be exactly 10 digits (numbers only).');
      return;
    }

    setLoading(true);

    const payload: RegisterPayload = {
      username: cleanUser,
      password: cleanPass,
      full_name: cleanName,
      role: regRole,
      phone: cleanPhone || undefined,
    };

    const res = await register(payload);
    if (!res.success) {
      setError(res.message || (language === 'np' ? 'दर्ता असफल भयो ।' : 'Registration failed.'));
      setLoading(false);
    } else {
      setSuccessMsg(language === 'np' ? 'नयाँ खाता सफलतापूर्वक दर्ता गरियो !' : 'Account registered successfully! Access granted.');
    }
  };

  // Password reset handler
  const handleResetPasswordSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanUser = resetUsername.trim().toLowerCase();
    const cleanPhone = resetPhone.trim();
    const cleanPass = resetNewPassword.trim();
    const cleanConfirm = resetConfirmPassword.trim();

    if (!cleanUser) {
      setError(language === 'np' ? 'कृपया प्रयोगकर्ता नाम (Login ID) राख्नुहोस् ।' : 'Please enter your username / Login ID.');
      return;
    }
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError(language === 'np' ? 'कृपया ठ्याक्कै १० अंकको दर्ता फोन नम्बर राख्नुहोस् ।' : 'Please enter your registered 10-digit phone number.');
      return;
    }
    if (!cleanPass) {
      setError(language === 'np' ? 'कृपया नयाँ पासवर्ड राख्नुहोस् ।' : 'Please enter a new password.');
      return;
    }
    if (cleanPass.length < 4) {
      setError(language === 'np' ? 'पासवर्ड कम्तिमा ४ अक्षरको हुनुपर्छ ।' : 'Password must be at least 4 characters long.');
      return;
    }
    if (cleanPass !== cleanConfirm) {
      setError(language === 'np' ? 'नयाँ पासवर्ड र पुष्टि पासवर्ड मिलेन ।' : 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUser,
          phone: cleanPhone,
          newPassword: cleanPass
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to reset password');
      }
      setSuccessMsg(language === 'np' ? 'पासवर्ड सफलतापूर्वक परिवर्तन भयो ! अब नयाँ पासवर्डले लगइन गर्नुहोस् ।' : 'Password reset successfully! Please sign in with your new password.');
      setMode('login');
      setUsername(cleanUser);
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Error resetting password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-950 p-4 font-sans text-slate-100 relative overflow-hidden select-none">
      {/* Background Decorative Tech Grids */}
      <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full flex flex-col overflow-hidden text-slate-800 dark:text-slate-100 z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header with Industrial Steel Gradient */}
        <div className="bg-gradient-to-r from-slate-950 via-zinc-900 to-slate-900 p-5 text-white relative shrink-0 border-b border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <AnayaCraftEmblem size={44} />
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white truncate">
                  {language === 'en' ? 'Iron Store ERP 2.0' : 'फलाम तथा स्टिल ईआरपी २.०'}
                </h2>
                <p className="text-[11px] text-slate-400 font-medium truncate">
                  {mode === 'login'
                    ? (language === 'en' ? 'Sign In to your authorized account' : 'आफ्नो आधिकारिक खातामा लगइन गर्नुहोस्')
                    : (language === 'en' ? 'Register New User Profile' : 'नयाँ प्रयोगकर्ता खाता दर्ता गर्नुहोस्')}
                </p>
              </div>
            </div>

            {/* Language & Theme Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setLanguage(language === 'en' ? 'np' : 'en')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition cursor-pointer"
                title="Switch Language"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{language === 'en' ? 'नेपाली' : 'English'}</span>
              </button>
              <ThemeSwitcher />
            </div>
          </div>
        </div>

        {/* Mode Switch Tabs: Sign In vs Register vs Reset Password */}
        <div className="grid grid-cols-3 p-1.5 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/60 text-xs font-bold gap-1">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer text-center ${
              mode === 'login'
                ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm border border-slate-200/80 dark:border-slate-700 font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{language === 'np' ? 'साइन इन' : 'Sign In'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer text-center ${
              mode === 'register'
                ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm border border-slate-200/80 dark:border-slate-700 font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{language === 'np' ? 'दर्ता गर्नुहोस्' : 'Register'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('reset');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer text-center ${
              mode === 'reset'
                ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm border border-slate-200/80 dark:border-slate-700 font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{language === 'np' ? 'पासवर्ड रिसेट' : 'Reset Pass'}</span>
          </button>
        </div>

        {/* Main Form Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[78vh]">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl flex items-center gap-2.5 text-rose-700 dark:text-rose-300 text-xs font-semibold animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center gap-2.5 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* SIGN IN FORM */}
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'np' ? 'प्रयोगकर्ता नाम / Login ID *' : 'Username or Login ID *'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={language === 'np' ? 'आफ्नो लगइन आईडी राख्नुहोस्' : 'Enter registered Login ID'}
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition font-medium text-slate-900 dark:text-slate-100"
                    autoFocus
                    autoComplete="username"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'np' ? 'पासवर्ड / Password *' : 'Password *'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-9 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition font-mono text-slate-900 dark:text-slate-100"
                    autoComplete="current-password"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span>{language === 'np' ? 'प्रमाणीकरण हुँदैछ...' : 'Authenticating...'}</span>
                ) : (
                  <>
                    <span>{language === 'np' ? 'ईआरपीमा लगइन गर्नुहोस्' : 'Sign In to Iron Store ERP'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-orange-600 dark:text-orange-400 hover:underline font-semibold cursor-pointer"
                >
                  {language === 'np' ? 'नयाँ खाता दर्ता गर्नुहोस् →' : 'Register new account →'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('reset');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:underline font-medium cursor-pointer"
                >
                  {language === 'np' ? 'पासवर्ड बिर्सनुभयो? रिसेट गर्नुहोस्' : 'Forgot Password?'}
                </button>
              </div>
            </form>
          ) : mode === 'register' ? (
            /* REGISTRATION FORM */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'np' ? 'पूरा नाम / Full Name *' : 'Full Name *'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder={language === 'np' ? 'उदा. राम बहादुर श्रेष्ठ' : 'e.g. Ram Bahadur Shrestha'}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition font-medium text-slate-900 dark:text-slate-100"
                    autoFocus
                    required
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'np' ? 'लगइन आईडी (User ID) *' : 'Login ID / Username *'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="e.g. ram_shrestha"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition font-mono text-slate-900 dark:text-slate-100 lowercase"
                      required
                    />
                    <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'np' ? 'पद / Role *' : 'Assigned Role *'}
                  </label>
                  <div className="relative">
                    <select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value as UserRole)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition font-medium text-slate-900 dark:text-slate-100 cursor-pointer"
                    >
                      <option value="cashier">Cashier / बिलिङ काउन्टर</option>
                      <option value="storekeeper">Storekeeper / गोदाम इन्चार्ज</option>
                      <option value="accountant">Accountant / लेखापाल</option>
                      <option value="admin">Owner / Store Admin</option>
                    </select>
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'np' ? 'सम्पर्क फोन / Mobile Number (१० अंक) *' : 'Mobile Phone Number (10 digits) *'}
                  </label>
                  <span className={`text-[10px] font-mono font-bold ${regPhone.length === 10 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {regPhone.length}/10 digits
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={10}
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="98XXXXXXXX (numbers only, exactly 10 digits)"
                    className={`w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition font-mono font-semibold text-slate-900 dark:text-slate-100 ${
                      regPhone && regPhone.length !== 10
                        ? 'border-rose-400 bg-rose-50/30'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                    required
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
                {regPhone && regPhone.length !== 10 && (
                  <span className="text-[10px] text-rose-600 font-semibold mt-0.5 block">
                    {language === 'np' ? 'फोन नम्बर ठ्याक्कै १० अंकको हुनुपर्छ ।' : 'Phone must be exactly 10 digits (numbers only).'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'np' ? 'पासवर्ड / Password *' : 'Password *'}
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition font-mono text-slate-900 dark:text-slate-100"
                      required
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'np' ? 'पासवर्ड पुष्टि *' : 'Confirm Password *'}
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition font-mono text-slate-900 dark:text-slate-100"
                      required
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-1"
              >
                {loading ? (
                  <span>{language === 'np' ? 'दर्ता हुँदैछ...' : 'Registering User Account...'}</span>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>{language === 'np' ? 'खाता दर्ता गरी ईआरपी खोल्नुहोस्' : 'Register & Access Iron Store ERP'}</span>
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs text-orange-600 dark:text-orange-400 hover:underline font-semibold cursor-pointer"
                >
                  {language === 'np' ? 'पहिले नै दर्ता खाता छ? यहाँबाट साइन इन गर्नुहोस् →' : 'Already have an account? Sign In here →'}
                </button>
              </div>
            </form>
          ) : (
            /* RESET PASSWORD FORM */
            <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-amber-800 dark:text-amber-300 text-xs font-medium">
                {language === 'np'
                  ? 'आफ्नो दर्ता युजरनेम र १० अंकको मोबाइल नम्बर प्रविष्ट गरी नयाँ पासवर्ड राख्नुहोस् ।'
                  : 'Enter your registered Login ID and 10-digit mobile phone to reset your password.'}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'np' ? 'दर्ता युजरनेम (Login ID) *' : 'Registered Login ID / Username *'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={resetUsername}
                    onChange={(e) => setResetUsername(e.target.value)}
                    placeholder="e.g. admin or ram_shrestha"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition font-mono text-slate-900 dark:text-slate-100 lowercase"
                    autoFocus
                    required
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'np' ? 'दर्ता मोबाइल नम्बर (१० अंक) *' : 'Registered Mobile Phone (10 digits) *'}
                  </label>
                  <span className={`text-[10px] font-mono font-bold ${resetPhone.length === 10 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {resetPhone.length}/10 digits
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={10}
                    value={resetPhone}
                    onChange={(e) => setResetPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="98XXXXXXXX (numbers only, exactly 10 digits)"
                    className={`w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition font-mono font-semibold text-slate-900 dark:text-slate-100 ${
                      resetPhone && resetPhone.length !== 10
                        ? 'border-rose-400 bg-rose-50/30'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                    required
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
                {resetPhone && resetPhone.length !== 10 && (
                  <span className="text-[10px] text-rose-600 font-semibold mt-0.5 block">
                    {language === 'np' ? 'फोन नम्बर ठ्याक्कै १० अंकको हुनुपर्छ ।' : 'Phone must be exactly 10 digits (numbers only).'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'np' ? 'नयाँ पासवर्ड / New Password *' : 'New Password *'}
                  </label>
                  <div className="relative">
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition font-mono text-slate-900 dark:text-slate-100"
                      required
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showResetPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'np' ? 'पासवर्ड पुष्टि *' : 'Confirm New Password *'}
                  </label>
                  <div className="relative">
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition font-mono text-slate-900 dark:text-slate-100"
                      required
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-1"
              >
                {loading ? (
                  <span>{language === 'np' ? 'रिसेट गरिँदैछ...' : 'Resetting Password...'}</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>{language === 'np' ? 'पासवर्ड रिसेट गर्नुहोस्' : 'Reset Password & Proceed'}</span>
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs text-orange-600 dark:text-orange-400 hover:underline font-semibold cursor-pointer"
                >
                  {language === 'np' ? 'साइन इनमा फर्किनुहोस् →' : 'Back to Sign In →'}
                </button>
              </div>
            </form>
          )}

          {/* Customer Support & Helpdesk Section */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 dark:from-slate-800/80 dark:via-slate-800/50 dark:to-slate-900 rounded-2xl p-3 border border-slate-200/90 dark:border-slate-700/80 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Headphones className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-1.5">
                      <span>{language === 'en' ? 'Customer Support & Helpdesk' : 'ग्राहक सहायता र हेल्पलाइन'}</span>
                      <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>{language === 'en' ? 'Live' : 'अनलाइन'}</span>
                      </span>
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                      {language === 'en' ? 'Need help with registration or credentials?' : 'दर्ता वा पासवर्डमा समस्या भएमा सम्पर्क गर्नुहोस्'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopySupportInfo}
                  className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs transition flex items-center space-x-1 cursor-pointer"
                  title="Copy support contact details"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-700 dark:text-emerald-400">{language === 'en' ? 'Copied!' : 'प्रतिलिपि भयो!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                      <span>{language === 'en' ? 'Copy Info' : 'प्रतिलिपि'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* 3 Contact Action Cards: Phone, WhatsApp, Email */}
              <div className="grid grid-cols-3 gap-2">
                <a
                  href={`tel:${supportPhoneClean}`}
                  className="p-2 rounded-xl bg-white dark:bg-slate-800/90 hover:bg-blue-50/90 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700/80 hover:border-blue-400 dark:hover:border-blue-500 transition group shadow-2xs flex flex-col items-center justify-center text-center cursor-pointer"
                  title={`Call Support: ${supportPhone}`}
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/40 group-hover:bg-blue-600 text-blue-600 dark:text-blue-400 group-hover:text-white flex items-center justify-center transition mb-1">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-400 leading-tight">
                    {language === 'en' ? 'Phone Call' : 'फोन कल'}
                  </span>
                  <span className="text-[8.5px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate w-full">
                    {supportPhone}
                  </span>
                </a>

                <a
                  href={whatsAppLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white dark:bg-slate-800/90 hover:bg-emerald-50/90 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700/80 hover:border-emerald-400 dark:hover:border-emerald-500 transition group shadow-2xs flex flex-col items-center justify-center text-center cursor-pointer"
                  title="Chat directly on WhatsApp"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 group-hover:bg-[#25D366] text-[#25D366] group-hover:text-white flex items-center justify-center transition mb-1">
                    <WhatsAppIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 leading-tight">
                    {language === 'en' ? 'WhatsApp' : 'ह्वाट्सएप'}
                  </span>
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold leading-tight mt-0.5">
                    {language === 'en' ? 'Live Chat ↗' : 'च्याट गर्नुहोस् ↗'}
                  </span>
                </a>

                <a
                  href={`mailto:${supportEmail}?subject=Nepal%20Iron%20Store%20ERP%20Support`}
                  className="p-2 rounded-xl bg-white dark:bg-slate-800/90 hover:bg-orange-50/90 dark:hover:bg-orange-950/40 border border-slate-200 dark:border-slate-700/80 hover:border-orange-400 dark:hover:border-orange-500 transition group shadow-2xs flex flex-col items-center justify-center text-center cursor-pointer"
                  title={`Email Support: ${supportEmail}`}
                >
                  <div className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-900/40 group-hover:bg-orange-600 text-orange-600 dark:text-orange-400 group-hover:text-white flex items-center justify-center transition mb-1">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-orange-700 dark:group-hover:text-orange-400 leading-tight">
                    {language === 'en' ? 'Email Desk' : 'इमेल डेस्क'}
                  </span>
                  <span className="text-[8.5px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate w-full">
                    {supportEmail}
                  </span>
                </a>
              </div>
            </div>

            {/* Official Anaya Craft Tech Branding Card */}
            <div className="pt-1 flex flex-col items-center justify-center text-center select-none">
              <AnayaCraftLogo variant="brand-card" size="sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
