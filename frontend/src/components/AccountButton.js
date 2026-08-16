import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { useAuth, formatApiError } from '../context/AuthContext';
import { ProfilePhotoStorage } from './ProfilePhotoStorage';
import { DigitalWallet } from './DigitalWallet';
import ImportantEvents from './ImportantEvents';
import { User, Mail, Phone, MapPin, Camera, Wallet, Package, Star, Loader2, KeyRound, ShieldAlert, Gift, X } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
};

const safeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const PasswordField = ({ id, label, value, onChange, placeholder, required = true, autoComplete }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative mt-1">
        <Input id={id} type={visible ? 'text' : 'password'} required={required} autoComplete={autoComplete} value={value} onChange={onChange} placeholder={placeholder} className="pr-12" />
        <button type="button" onClick={() => setVisible((v) => !v)} className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-md hover:bg-rose-50" aria-label={visible ? 'Hide password' : 'Show password'}>
          <span className="text-xs font-semibold text-gray-500">{visible ? 'Hide' : 'Show'}</span>
        </button>
      </div>
    </div>
  );
};

const OrdersTab = ({ userId, token }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    axios.get(`${API}/orders/${userId}`, config)
      .then((r) => active && setOrders(Array.isArray(r.data) ? r.data : (r.data?.orders || [])))
      .catch(() => active && setOrders([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [userId, token]);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-rose-500" /></div>;
  if (!orders.length) return <Card><CardContent className="text-center py-10"><Package className="w-14 h-14 text-gray-300 mx-auto mb-3" /><h3 className="text-lg font-semibold">No orders yet</h3><p className="text-gray-500 text-sm">Your placed orders will appear here.</p></CardContent></Card>;

  return <div className="space-y-3">{orders.map((o) => (
    <Card key={o.id}><CardContent className="p-4 flex items-center justify-between gap-4"><div><p className="font-medium">#{String(o.id || '').substring(0, 8)}</p><p className="text-sm text-gray-500">{Array.isArray(o.items) ? o.items.length : 0} item(s) · {o.delivery_type || 'Order'}</p><p className="text-xs text-gray-400">{o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN') : ''}</p></div><div className="text-right"><p className="font-bold">₹{safeNumber(o.total_amount).toLocaleString('en-IN')}</p><Badge className={statusColors[o.status] || 'bg-gray-100 text-gray-800'}>{o.status || 'pending'}</Badge></div></CardContent></Card>
  ))}</div>;
};

const tabItems = [
  ['profile', User, 'Profile'],
  ['photos', Camera, 'Photos'],
  ['wallet', Wallet, 'Wallet'],
  ['orders', Package, 'Orders'],
  ['events', Gift, 'Important Dates'],
];

export const AccountButton = () => {
  const { user, isAuthenticated, token, login, register, changePassword, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' });
  const [showForgot, setShowForgot] = useState(false);
  const [forgotForm, setForgotForm] = useState({ email: '', phone: '', next: '', confirm: '' });

  const closeModal = () => { setOpen(false); setShowForgot(false); setActiveTab('profile'); };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (forgotForm.next.length < 6) return toast.error('New password must be at least 6 characters');
    if (forgotForm.next !== forgotForm.confirm) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, { email: forgotForm.email.trim().toLowerCase(), phone: forgotForm.phone.trim(), new_password: forgotForm.next });
      toast.success('Password reset! Please log in with your new password. 🔐');
      setShowForgot(false); setForgotForm({ email: '', phone: '', next: '', confirm: '' }); setMode('login');
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail) || 'Reset failed. Check your email and registered phone.'); }
    finally { setLoading(false); }
  };

  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const u = await login(loginForm.email, loginForm.password);
      setActiveTab('profile'); setLoginForm({ email: '', password: '' });
      if (u.must_change_password) { toast.info('Please set a new password to continue.'); setPwdForm({ current: loginForm.password, next: '', confirm: '' }); }
      else toast.success(`Welcome back, ${u.name}! 🎉`);
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail) || 'Login failed'); }
    finally { setLoading(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwdForm.next.length < 6) return toast.error('New password must be at least 6 characters');
    if (pwdForm.next !== pwdForm.confirm) return toast.error('Passwords do not match');
    setLoading(true);
    try { await changePassword(pwdForm.current, pwdForm.next); toast.success('Password updated successfully! 🔐'); setPwdForm({ current: '', next: '', confirm: '' }); setActiveTab('profile'); }
    catch (err) { toast.error(formatApiError(err.response?.data?.detail) || 'Failed to change password'); }
    finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (registerForm.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try { const u = await register(registerForm); toast.success(`Welcome to Memories, ${u.name}! 🎉`); setActiveTab('profile'); setRegisterForm({ name: '', email: '', password: '', phone: '' }); }
    catch (err) { toast.error(formatApiError(err.response?.data?.detail) || 'Registration failed'); }
    finally { setLoading(false); }
  };

  const handleLogout = () => { logout(); toast.success('Logged out successfully'); closeModal(); };

  const renderAuthenticatedContent = () => {
    if (user?.must_change_password) return (
      <>
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-rose-600" />Set a New Password</h2><p className="text-sm text-gray-500 mt-1">For your security, please choose a new password before continuing.</p></div><button type="button" onClick={closeModal} aria-label="Close" className="p-2 rounded-full hover:bg-gray-100"><X className="w-5 h-5" /></button></div>
        <form onSubmit={handleChangePassword} className="space-y-4 mt-5"><PasswordField id="fc-current" label="Current / temporary password" value={pwdForm.current} onChange={(e) => setPwdForm({ ...pwdForm, current: e.target.value })} autoComplete="current-password" /><PasswordField id="fc-next" label="New password" value={pwdForm.next} onChange={(e) => setPwdForm({ ...pwdForm, next: e.target.value })} autoComplete="new-password" /><PasswordField id="fc-confirm" label="Confirm new password" value={pwdForm.confirm} onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })} autoComplete="new-password" /><Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-rose-500 to-pink-600">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><KeyRound className="w-4 h-4 mr-2" />Update Password</>}</Button><Button type="button" variant="ghost" className="w-full" onClick={handleLogout}>Cancel & Log out</Button></form>
      </>
    );

    return (
      <>
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold flex items-center gap-2"><User className="w-5 h-5 text-rose-600" />Your Account</h2><p className="text-sm text-gray-500 mt-1">Manage your profile, photos, wallet, orders and important dates.</p></div><button type="button" onClick={closeModal} aria-label="Close" className="p-2 rounded-full hover:bg-gray-100"><X className="w-5 h-5" /></button></div>

        <div className="mt-5 border-b border-gray-200"><div className="grid grid-cols-2 sm:grid-cols-5 gap-1">{tabItems.map(([key, Icon, label]) => (
          <button key={key} type="button" onClick={() => setActiveTab(key)} className={`min-h-10 px-2 py-2 rounded-t-lg text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${activeTab === key ? 'bg-rose-50 text-rose-700 border-b-2 border-rose-500' : 'text-gray-600 hover:bg-gray-50'}`} aria-selected={activeTab === key}><Icon className="w-4 h-4" />{label}</button>
        ))}</div></div>

        <div className="mt-5 min-h-[260px]">
          {activeTab === 'profile' && <Card className="border-rose-200"><CardHeader className="pb-3"><div className="flex items-center gap-3"><div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-pink-500 rounded-full flex items-center justify-center"><span className="text-white font-bold text-2xl">{user?.name?.charAt(0)?.toUpperCase() || 'M'}</span></div><div><CardTitle className="text-xl text-gray-900">{user?.name || 'Memories Customer'}</CardTitle><CardDescription>Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN') : 'today'}</CardDescription><Badge className="bg-green-100 text-green-800 mt-1">{user?.tier || 'Silver'} Member</Badge></div></div></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="flex items-center gap-3"><Mail className="w-4 h-4 text-gray-500" /><span className="text-gray-700 break-all">{user?.email || 'Not provided'}</span></div><div className="flex items-center gap-3"><Phone className="w-4 h-4 text-gray-500" /><span className="text-gray-700">{user?.phone || 'Not provided'}</span></div></div>{user?.address && <div className="flex items-start gap-3"><MapPin className="w-4 h-4 text-gray-500 mt-1" /><span className="text-gray-700">{user.address}</span></div>}<div className="grid grid-cols-3 gap-3 pt-2"><div className="bg-rose-50 rounded-lg p-3 text-center"><p className="text-xs text-gray-500">Wallet</p><p className="font-bold text-rose-600">₹{safeNumber(user?.wallet_balance).toLocaleString('en-IN')}</p></div><div className="bg-yellow-50 rounded-lg p-3 text-center"><p className="text-xs text-gray-500">Points</p><p className="font-bold text-yellow-600"><Star className="w-3 h-3 inline mr-1" />{safeNumber(user?.points)}</p></div><div className="bg-green-50 rounded-lg p-3 text-center"><p className="text-xs text-gray-500">Spent</p><p className="font-bold text-green-600">₹{safeNumber(user?.total_spent).toLocaleString('en-IN')}</p></div></div><Button variant="outline" onClick={handleLogout}>Sign Out</Button></CardContent></Card>}
          {activeTab === 'photos' && <ProfilePhotoStorage userId={user.id} />}
          {activeTab === 'wallet' && <DigitalWallet userId={user.id} />}
          {activeTab === 'orders' && <OrdersTab userId={user.id} token={token} />}
          {activeTab === 'events' && <ImportantEvents userId={user.id} />}
        </div>
      </>
    );
  };

  return (
    <>
      <button data-testid="account-button" className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative group" onClick={() => { setOpen(true); setActiveTab('profile'); }} aria-label="Account"><User className="w-5 h-5" />{isAuthenticated && <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white" />}</button>
      {open && <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Memories account" onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
        <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-xl bg-white shadow-2xl border border-gray-200"><div className="p-4 sm:p-6">
          {!isAuthenticated ? <>
            <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold flex items-center gap-2"><User className="w-5 h-5 text-rose-600" />Welcome to Memories</h2><p className="text-sm text-gray-500 mt-1">Sign in or create an account to track orders, save photos and use your wallet.</p></div><button type="button" onClick={closeModal} aria-label="Close" className="p-2 rounded-full hover:bg-gray-100"><X className="w-5 h-5" /></button></div>
            {showForgot ? <form onSubmit={handleForgotSubmit} className="space-y-4 mt-5 max-w-xl"><p className="text-sm text-gray-600">Reset your password using your registered email and phone number.</p><div><Label>Email</Label><Input type="email" required value={forgotForm.email} onChange={(e) => setForgotForm({ ...forgotForm, email: e.target.value })} className="mt-1" /></div><div><Label>Registered phone number</Label><Input type="tel" required value={forgotForm.phone} onChange={(e) => setForgotForm({ ...forgotForm, phone: e.target.value })} className="mt-1" /></div><PasswordField id="forgot-next" label="New password" value={forgotForm.next} onChange={(e) => setForgotForm({ ...forgotForm, next: e.target.value })} placeholder="At least 6 characters" autoComplete="new-password" /><PasswordField id="forgot-confirm" label="Confirm new password" value={forgotForm.confirm} onChange={(e) => setForgotForm({ ...forgotForm, confirm: e.target.value })} placeholder="Re-enter your password" autoComplete="new-password" /><Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-rose-500 to-pink-500">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset Password'}</Button><button type="button" onClick={() => setShowForgot(false)} className="w-full text-sm text-gray-500">← Back to login</button></form> : <div className="mt-5 max-w-xl"><div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-lg"><button type="button" onClick={() => setMode('login')} className={`py-2 rounded-md text-sm font-medium ${mode === 'login' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Login</button><button type="button" onClick={() => setMode('register')} className={`py-2 rounded-md text-sm font-medium ${mode === 'register' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Sign Up</button></div>{mode === 'login' ? <form onSubmit={handleLogin} className="space-y-4 mt-5"><div><Label>Email</Label><Input type="email" required value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} className="mt-1" /></div><PasswordField id="login-password" label="Password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} placeholder="Enter your password" autoComplete="current-password" /><Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-rose-500 to-pink-500">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Login'}</Button><button type="button" onClick={() => setShowForgot(true)} className="w-full text-center text-sm text-gray-500">Forgot Password?</button></form> : <form onSubmit={handleRegister} className="space-y-4 mt-5"><div><Label>Full Name *</Label><Input required value={registerForm.name} onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })} className="mt-1" /></div><div><Label>Email *</Label><Input type="email" required value={registerForm.email} onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })} className="mt-1" /></div><div><Label>Phone</Label><Input value={registerForm.phone} onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })} className="mt-1" /></div><PasswordField id="reg-password" label="Password *" value={registerForm.password} onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })} placeholder="At least 6 characters" autoComplete="new-password" /><Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-rose-500 to-pink-500">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}</Button></form>}</div>}
          </> : renderAuthenticatedContent()}
        </div></div>
      </div>}
    </>
  );
};

export default AccountButton;
