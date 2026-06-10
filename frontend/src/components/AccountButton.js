import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner";
import { useAuth, formatApiError } from "../context/AuthContext";
import { ProfilePhotoStorage } from './ProfilePhotoStorage';
import { DigitalWallet } from './DigitalWallet';
import {
  User, Mail, Phone, MapPin, LogOut, Camera, Wallet, Package, ShoppingCart, Star, Loader2
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
};

const OrdersTab = ({ userId }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    axios.get(`${API}/orders/${userId}`)
      .then((res) => { if (active) setOrders(res.data || []); })
      .catch(() => { if (active) setOrders([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId]);

  if (loading) {
    return <div className="flex justify-center py-10" data-testid="orders-loading"><Loader2 className="w-6 h-6 animate-spin text-rose-500" /></div>;
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-10" data-testid="orders-empty">
          <Package className="w-14 h-14 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No orders yet</h3>
          <p className="text-gray-500 text-sm">Your placed orders will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3" data-testid="orders-list">
      {orders.map((o) => (
        <Card key={o.id} data-testid="order-item">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">#{o.id.substring(0, 8)}</p>
              <p className="text-sm text-gray-500">{(o.items || []).length} item(s) · {o.delivery_type}</p>
              <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-900">₹{o.total_amount}</p>
              <Badge className={statusColors[o.status] || 'bg-gray-100 text-gray-800'}>{o.status}</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export const AccountButton = () => {
  const { user, isAuthenticated, login, register, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '', phone: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(loginForm.email, loginForm.password);
      toast.success(`Welcome back, ${u.name}! 🎉`);
      setActiveTab('profile');
      setLoginForm({ email: '', password: '' });
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await register(registerForm);
      toast.success(`Welcome to Memories, ${u.name}! 🎉`);
      setActiveTab('profile');
      setRegisterForm({ name: '', email: '', password: '', phone: '' });
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    setOpen(false);
  };

  return (
    <>
      <button
        data-testid="account-button"
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative group"
        onClick={() => setOpen(true)}
        aria-label="Account"
      >
        <User className="w-5 h-5" />
        {isAuthenticated && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white"></div>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="account-dialog">
          {!isAuthenticated ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-rose-600" />
                  <span>Welcome to Memories</span>
                </DialogTitle>
                <DialogDescription>
                  Sign in or create an account to track orders, save photos and use your wallet.
                </DialogDescription>
              </DialogHeader>

              <Tabs value={mode} onValueChange={setMode} className="mt-2">
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
                  <TabsTrigger value="register" data-testid="tab-register">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4 mt-4" data-testid="login-form">
                    <div>
                      <Label htmlFor="login-email">Email</Label>
                      <Input id="login-email" type="email" required data-testid="login-email-input"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                        placeholder="you@example.com" className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="login-password">Password</Label>
                      <Input id="login-password" type="password" required data-testid="login-password-input"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        placeholder="Enter your password" className="mt-1" />
                    </div>
                    <Button type="submit" disabled={loading} data-testid="login-submit-button"
                      className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Login'}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4 mt-4" data-testid="register-form">
                    <div>
                      <Label htmlFor="reg-name">Full Name *</Label>
                      <Input id="reg-name" required data-testid="register-name-input"
                        value={registerForm.name}
                        onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                        placeholder="Your name" className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="reg-email">Email *</Label>
                      <Input id="reg-email" type="email" required data-testid="register-email-input"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                        placeholder="you@example.com" className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="reg-phone">Phone</Label>
                      <Input id="reg-phone" data-testid="register-phone-input"
                        value={registerForm.phone}
                        onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                        placeholder="Phone number" className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="reg-password">Password *</Label>
                      <Input id="reg-password" type="password" required data-testid="register-password-input"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                        placeholder="At least 6 characters" className="mt-1" />
                    </div>
                    <Button type="submit" disabled={loading} data-testid="register-submit-button"
                      className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-rose-600" />
                  <span>Your Account</span>
                </DialogTitle>
                <DialogDescription>Manage your profile, photos, wallet and orders.</DialogDescription>
              </DialogHeader>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 mt-2">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="profile" data-testid="profile-tab"><User className="w-4 h-4 mr-1" />Profile</TabsTrigger>
                  <TabsTrigger value="photos" data-testid="photos-tab"><Camera className="w-4 h-4 mr-1" />Photos</TabsTrigger>
                  <TabsTrigger value="wallet" data-testid="wallet-tab"><Wallet className="w-4 h-4 mr-1" />Wallet</TabsTrigger>
                  <TabsTrigger value="orders" data-testid="orders-tab"><Package className="w-4 h-4 mr-1" />Orders</TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                  <Card className="border-rose-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-pink-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-2xl">{user.name?.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <CardTitle className="text-xl text-gray-900" data-testid="profile-name">{user.name}</CardTitle>
                          <CardDescription>Member since {new Date(user.created_at).toLocaleDateString()}</CardDescription>
                          <Badge className="bg-green-100 text-green-800 mt-1">{user.tier || 'Silver'} Member</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-3"><Mail className="w-4 h-4 text-gray-500" /><span className="text-gray-700">{user.email}</span></div>
                        <div className="flex items-center space-x-3"><Phone className="w-4 h-4 text-gray-500" /><span className="text-gray-700">{user.phone || 'Not provided'}</span></div>
                      </div>
                      {user.address && (
                        <div className="flex items-start space-x-3"><MapPin className="w-4 h-4 text-gray-500 mt-1" /><span className="text-gray-700">{user.address}</span></div>
                      )}
                      <div className="grid grid-cols-3 gap-3 pt-2">
                        <div className="bg-rose-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500">Wallet</p>
                          <p className="font-bold text-rose-600">₹{user.wallet_balance || 0}</p>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500">Points</p>
                          <p className="font-bold text-yellow-600 flex items-center justify-center"><Star className="w-3 h-3 mr-1" />{user.points || 0}</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500">Spent</p>
                          <p className="font-bold text-green-600">₹{user.total_spent || 0}</p>
                        </div>
                      </div>
                      <div className="pt-4">
                        <Button variant="outline" onClick={handleLogout} data-testid="logout-button" className="border-gray-300">
                          <LogOut className="w-4 h-4 mr-2" />Sign Out
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="photos">
                  <ProfilePhotoStorage userId={user.id} onPhotoSelected={() => { toast.success('Photo selected!'); setOpen(false); }} />
                </TabsContent>

                <TabsContent value="wallet">
                  <DigitalWallet userId={user.id} onBalanceUpdate={() => {}} />
                </TabsContent>

                <TabsContent value="orders">
                  <OrdersTab userId={user.id} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AccountButton;
