import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { toast } from "sonner";
import { 
  Shield, 
  BarChart3, 
  Users, 
  Package, 
  Star, 
  ShoppingCart,
  Eye,
  Check,
  X,
  Edit,
  Trash2,
  Plus,
  Download,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  DollarSign,
  TrendingUp,
  Activity,
  AlertTriangle,
  Clock,
  CheckCircle,
  Settings,
  LogOut,
  Home,
  Wallet,
  Lock,
  Unlock,
  Pin,
  MessageCircle
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Build axios config with the admin JWT (overrides any user token set globally)
const adminAuthConfig = (extra = {}) => {
  let token = '';
  try {
    token = JSON.parse(localStorage.getItem('adminAuth') || '{}').token || '';
  } catch (e) {
    token = '';
  }
  return { ...extra, headers: { ...(extra.headers || {}), Authorization: `Bearer ${token}` } };
};

export const AdminPanel = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  
  // Dashboard data
  const [stats, setStats] = useState({
    total_users: 0,
    total_orders: 0,
    total_revenue: 0,
    pending_reviews: 0,
    total_products: 0,
    recent_orders: [],
    top_products: []
  });
  
  // Management data
  const [reviews, setReviews] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  
  // Login form
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: ''
  });

  // Wallet adjust dialog
  const [walletUser, setWalletUser] = useState(null);
  const [walletForm, setWalletForm] = useState({ amount: '', type: 'credit', reason: '' });

  // Product create/edit dialog
  const [productDialog, setProductDialog] = useState({ open: false, mode: 'create', id: null });
  const [productForm, setProductForm] = useState({ name: '', description: '', category: 'frames', base_price: '', image_url: '' });

  // Public config (shop WhatsApp number)
  const [shopWhatsapp, setShopWhatsapp] = useState('918148040148');
  useEffect(() => {
    axios.get(`${API}/config`).then((r) => setShopWhatsapp(r.data.shop_whatsapp)).catch(() => {});
  }, []);

  const messageCustomerStatus = (order) => {
    const phone = (order.customer?.phone || '').replace(/[^0-9]/g, '');
    if (!phone) {
      toast.error('No phone number on file for this customer');
      return;
    }
    const waPhone = phone.length === 10 ? `91${phone}` : phone;
    const text = encodeURIComponent(
      `Hello ${order.customer?.name || ''}, this is Memories Photo Frames. ` +
      `Your order #${order.id.substring(0, 8).toUpperCase()} (₹${order.total}) is now *${order.status}*. ` +
      `Thank you for shopping with us!`
    );
    window.open(`https://wa.me/${waPhone}?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  // Check if already authenticated on load
  useEffect(() => {
    const savedAuth = localStorage.getItem('adminAuth');
    if (savedAuth) {
      const authData = JSON.parse(savedAuth);
      setIsAuthenticated(true);
      setAdminData(authData.admin);
      loadDashboardData();
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/admin/login`, loginForm);
      
      if (response.data.success) {
        setIsAuthenticated(true);
        setAdminData(response.data.admin);
        
        // Save authentication
        localStorage.setItem('adminAuth', JSON.stringify({
          admin: response.data.admin,
          token: response.data.token,
          loginTime: new Date().toISOString()
        }));
        
        toast.success(`Welcome back, ${response.data.admin.username}! 🎉`);
        loadDashboardData();
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminData(null);
    localStorage.removeItem('adminAuth');
    toast.success('Logged out successfully');
  };

  const loadDashboardData = async () => {
    try {
      const response = await axios.get(`${API}/admin/stats`, adminAuthConfig());
      setStats(response.data);
    } catch (error) {
      handleApiError(error, 'Failed to load dashboard data');
    }
  };

  const handleApiError = (error, fallback) => {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      toast.error('Your admin session expired. Please sign in again.');
      handleLogout();
    } else {
      console.error(fallback, error);
      toast.error(fallback);
    }
  };

  const loadReviews = async (status = 'all') => {
    try {
      const response = await axios.get(`${API}/admin/reviews?status=${status}`, adminAuthConfig());
      setReviews(response.data.reviews);
    } catch (error) {
      handleApiError(error, 'Failed to load reviews');
    }
  };

  const loadOrders = async (status = 'all') => {
    try {
      const response = await axios.get(`${API}/admin/orders?status=${status}`, adminAuthConfig());
      setOrders(response.data.orders);
    } catch (error) {
      handleApiError(error, 'Failed to load orders');
    }
  };

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API}/admin/users`, adminAuthConfig());
      setUsers(response.data.users);
    } catch (error) {
      handleApiError(error, 'Failed to load users');
    }
  };

  const loadProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`);
      setProducts(response.data);
    } catch (error) {
      handleApiError(error, 'Failed to load products');
    }
  };

  const approveReview = async (reviewId, approved) => {
    try {
      await axios.put(`${API}/admin/reviews/${reviewId}/approve`, null, adminAuthConfig({ params: { approved } }));
      toast.success(approved ? 'Review approved!' : 'Review rejected!');
      loadReviews();
    } catch (error) {
      handleApiError(error, 'Failed to update review');
    }
  };

  const deleteReview = async (reviewId) => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      try {
        await axios.delete(`${API}/admin/reviews/${reviewId}`, adminAuthConfig());
        toast.success('Review deleted!');
        loadReviews();
        loadDashboardData(); // Refresh stats
      } catch (error) {
        handleApiError(error, 'Failed to delete review');
      }
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`${API}/admin/orders/${orderId}/status`, null, adminAuthConfig({ params: { status: newStatus } }));
      toast.success(`Order status updated to ${newStatus}!`);
      loadOrders();
      loadDashboardData(); // Refresh stats
    } catch (error) {
      handleApiError(error, 'Failed to update order status');
    }
  };

  const pinReview = async (reviewId, pinned) => {
    try {
      await axios.put(`${API}/admin/reviews/${reviewId}/pin`, null, adminAuthConfig({ params: { pinned } }));
      toast.success(pinned ? 'Review pinned (featured)!' : 'Review unpinned');
      loadReviews();
    } catch (error) {
      handleApiError(error, 'Failed to update review');
    }
  };

  const deleteProduct = async (productId) => {
    if (window.confirm('Delete this product? This cannot be undone.')) {
      try {
        await axios.delete(`${API}/admin/products/${productId}`, adminAuthConfig());
        toast.success('Product deleted!');
        loadProducts();
      } catch (error) {
        handleApiError(error, 'Failed to delete product');
      }
    }
  };

  const submitWalletAdjust = async () => {
    const amount = parseFloat(walletForm.amount);
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    if (!walletForm.reason.trim()) { toast.error('A reason/note is required'); return; }
    try {
      await axios.post(`${API}/admin/users/${walletUser.id}/wallet/adjust`, {
        amount, type: walletForm.type, reason: walletForm.reason.trim(),
      }, adminAuthConfig());
      toast.success(`Wallet ${walletForm.type}ed by ₹${amount}`);
      setWalletUser(null);
      setWalletForm({ amount: '', type: 'credit', reason: '' });
      loadUsers();
    } catch (error) {
      handleApiError(error, 'Failed to adjust wallet');
    }
  };

  const openCreateProduct = () => {
    setProductForm({ name: '', description: '', category: 'frames', base_price: '', image_url: '' });
    setProductDialog({ open: true, mode: 'create', id: null });
  };

  const openEditProduct = (product) => {
    setProductForm({
      name: product.name || '', description: product.description || '',
      category: product.category || 'frames', base_price: String(product.base_price || ''),
      image_url: product.image_url || '',
    });
    setProductDialog({ open: true, mode: 'edit', id: product.id });
  };

  const submitProduct = async () => {
    if (!productForm.name.trim() || !productForm.base_price) { toast.error('Name and price are required'); return; }
    const payload = {
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      category: productForm.category,
      base_price: parseFloat(productForm.base_price),
      image_url: productForm.image_url.trim() || 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca',
    };
    try {
      if (productDialog.mode === 'create') {
        await axios.post(`${API}/admin/products`, { ...payload, sizes: [], materials: [], colors: [] }, adminAuthConfig());
        toast.success('Product created!');
      } else {
        await axios.put(`${API}/admin/products/${productDialog.id}`, payload, adminAuthConfig());
        toast.success('Product updated!');
      }
      setProductDialog({ open: false, mode: 'create', id: null });
      loadProducts();
    } catch (error) {
      handleApiError(error, 'Failed to save product');
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Memories Admin Panel</CardTitle>
            <CardDescription>
              Sign in to access the admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter username"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Demo Credentials:</p>
              <p className="text-xs text-gray-500">Username: admin</p>
              <p className="text-xs text-gray-500">Password: memories2024</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Admin Dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Memories Admin Panel</h1>
                <p className="text-sm text-gray-600">Manage your photo frames business</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {adminData?.role}
              </Badge>
              <span className="text-sm text-gray-700">
                Welcome, {adminData?.username}
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'orders') loadOrders();
          else if (tab === 'reviews') loadReviews('all');
          else if (tab === 'users') loadUsers();
          else if (tab === 'products') loadProducts();
          else if (tab === 'dashboard') loadDashboardData();
        }}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard" className="flex items-center">
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex items-center">
              <Star className="w-4 h-4 mr-2" />
              Reviews
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center">
              <Package className="w-4 h-4 mr-2" />
              Products
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold">{stats.total_users}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <ShoppingCart className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">Total Orders</p>
                      <p className="text-2xl font-bold">{stats.total_orders}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">Total Revenue</p>
                      <p className="text-2xl font-bold">₹{stats.total_revenue?.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">Pending Reviews</p>
                      <p className="text-2xl font-bold">{stats.pending_reviews}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Orders */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Recent Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.recent_orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">#{order.id.substring(0, 8)}</p>
                          <p className="text-sm text-gray-600">{order.customer?.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">₹{order.total}</p>
                          <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full mt-4"
                    onClick={() => {setActiveTab('orders'); loadOrders();}}
                  >
                    View All Orders
                  </Button>
                </CardContent>
              </Card>

              {/* Top Products */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Top Products
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.top_products.map((product, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-gray-600">{product.sales} sales</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">₹{product.revenue.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full mt-4"
                    onClick={() => {setActiveTab('products'); loadProducts();}}
                  >
                    View All Products
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Order Management</CardTitle>
                  <Button onClick={() => loadOrders()}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Order ID</th>
                        <th className="text-left p-2">Customer</th>
                        <th className="text-left p-2">Items</th>
                        <th className="text-left p-2">Total</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">#{order.id.substring(0, 8)}</td>
                          <td className="p-2">{order.customer?.name}</td>
                          <td className="p-2">{order.items?.length} items</td>
                          <td className="p-2">₹{order.total}</td>
                          <td className="p-2">
                            <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                              {order.status}
                            </Badge>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center space-x-2">
                              <select
                                value={order.status}
                                onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                className="text-sm border rounded px-2 py-1"
                              >
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="refunded">Refunded</option>
                              </select>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!order.customer?.phone}
                                title={order.customer?.phone ? 'Message customer order status on WhatsApp' : 'No phone on file'}
                                onClick={() => messageCustomerStatus(order)}
                                data-testid={`order-whatsapp-${order.id}`}
                                className="text-green-700 border-green-200 hover:bg-green-50"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Review Management</CardTitle>
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={() => loadReviews('pending')}>
                      Pending
                    </Button>
                    <Button variant="outline" onClick={() => loadReviews('approved')}>
                      Approved
                    </Button>
                    <Button onClick={() => loadReviews('all')}>
                      All Reviews
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <Card key={review.id} className={`${!review.approved ? 'border-orange-200 bg-orange-50' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-medium">{review.name}</h4>
                              {renderStars(review.rating)}
                              <Badge variant={review.approved ? 'default' : 'secondary'}>
                                {review.approved ? 'Approved' : 'Pending'}
                              </Badge>
                            </div>
                            <p className="text-gray-700 mb-2">{review.comment}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(review.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            {!review.approved && (
                              <Button
                                size="sm"
                                onClick={() => approveReview(review.id, true)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            )}
                            {!review.approved && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => approveReview(review.id, false)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant={review.pinned ? 'default' : 'outline'}
                              onClick={() => pinReview(review.id, !review.pinned)}
                              data-testid={`pin-review-${review.id}`}
                              title={review.pinned ? 'Unpin' : 'Pin as featured'}
                            >
                              <Pin className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteReview(review.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Product Management</CardTitle>
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={openCreateProduct} data-testid="add-product-button">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Product
                    </Button>
                    <Button onClick={() => loadProducts()}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Products
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((product) => (
                    <Card key={product.id}>
                      <CardContent className="p-4">
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-full h-32 object-cover rounded-lg mb-3"
                        />
                        <h4 className="font-medium mb-1">{product.name}</h4>
                        <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-lg">₹{product.base_price}</span>
                          <div className="flex space-x-1">
                            <Button size="sm" variant="outline" onClick={() => openEditProduct(product)} data-testid={`edit-product-${product.id}`}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteProduct(product.id)} data-testid={`delete-product-${product.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>User Management</CardTitle>
                  <Button onClick={() => loadUsers()}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Users
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">Email</th>
                        <th className="text-left p-2">Phone</th>
                        <th className="text-left p-2">Wallet Balance</th>
                        <th className="text-left p-2">Total Spent</th>
                        <th className="text-left p-2">Joined</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-medium">{user.name}</td>
                          <td className="p-2">{user.email}</td>
                          <td className="p-2">{user.phone}</td>
                          <td className="p-2">₹{user.wallet_balance || 0}</td>
                          <td className="p-2">₹{user.total_spent || 0}</td>
                          <td className="p-2">{new Date(user.created_at).toLocaleDateString()}</td>
                          <td className="p-2">
                            <Button size="sm" variant="outline" onClick={() => { setWalletUser(user); setWalletForm({ amount: '', type: 'credit', reason: '' }); }} data-testid={`adjust-wallet-${user.id}`}>
                              <Wallet className="w-4 h-4 mr-1" />
                              Adjust Wallet
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Admin Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Auto-approve reviews</span>
                    <Button variant="outline" size="sm">
                      <Lock className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Email notifications</span>
                    <Button variant="outline" size="sm">
                      <Unlock className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Maintenance mode</span>
                    <Button variant="outline" size="sm">
                      <Lock className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" onClick={loadDashboardData}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh All Data
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export Orders
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export Users
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => { window.location.href = '/'; }} data-testid="back-to-website-button">
                    <Home className="w-4 h-4 mr-2" />
                    Back to Website
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Wallet Adjust Dialog */}
      <Dialog open={!!walletUser} onOpenChange={(o) => !o && setWalletUser(null)}>
        <DialogContent data-testid="wallet-adjust-dialog">
          <DialogHeader>
            <DialogTitle>Adjust Wallet — {walletUser?.name}</DialogTitle>
            <DialogDescription>
              Current balance: ₹{walletUser?.wallet_balance || 0}. Every adjustment is logged with your reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <select
                  value={walletForm.type}
                  onChange={(e) => setWalletForm({ ...walletForm, type: e.target.value })}
                  className="w-full mt-1 border rounded-md px-3 py-2 text-sm"
                  data-testid="wallet-adjust-type"
                >
                  <option value="credit">Credit (add)</option>
                  <option value="debit">Debit (deduct)</option>
                </select>
              </div>
              <div>
                <Label htmlFor="wallet-amount">Amount (₹)</Label>
                <Input id="wallet-amount" type="number" min="1" value={walletForm.amount}
                  onChange={(e) => setWalletForm({ ...walletForm, amount: e.target.value })}
                  className="mt-1" data-testid="wallet-adjust-amount" />
              </div>
            </div>
            <div>
              <Label htmlFor="wallet-reason">Reason / Note (required)</Label>
              <Textarea id="wallet-reason" value={walletForm.reason}
                onChange={(e) => setWalletForm({ ...walletForm, reason: e.target.value })}
                placeholder="e.g. Refund for cancelled order #1234" className="mt-1" rows={2}
                data-testid="wallet-adjust-reason" />
            </div>
            <Button onClick={submitWalletAdjust} className="w-full bg-gradient-to-r from-blue-500 to-indigo-600" data-testid="wallet-adjust-submit">
              Apply Adjustment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Create/Edit Dialog */}
      <Dialog open={productDialog.open} onOpenChange={(o) => setProductDialog({ ...productDialog, open: o })}>
        <DialogContent data-testid="product-form-dialog">
          <DialogHeader>
            <DialogTitle>{productDialog.mode === 'create' ? 'Add Product' : 'Edit Product'}</DialogTitle>
            <DialogDescription>Manage product details for your store.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="p-name">Name *</Label>
              <Input id="p-name" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} className="mt-1" data-testid="product-name-input" />
            </div>
            <div>
              <Label htmlFor="p-desc">Description</Label>
              <Textarea id="p-desc" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} className="mt-1" rows={2} data-testid="product-desc-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <select value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} className="w-full mt-1 border rounded-md px-3 py-2 text-sm" data-testid="product-category-input">
                  <option value="frames">Frames</option>
                  <option value="mugs">Mugs</option>
                  <option value="tshirts">T-Shirts</option>
                  <option value="acrylic">Acrylic</option>
                  <option value="led">LED</option>
                  <option value="corporate">Corporate</option>
                </select>
              </div>
              <div>
                <Label htmlFor="p-price">Base Price (₹) *</Label>
                <Input id="p-price" type="number" min="0" value={productForm.base_price} onChange={(e) => setProductForm({ ...productForm, base_price: e.target.value })} className="mt-1" data-testid="product-price-input" />
              </div>
            </div>
            <div>
              <Label htmlFor="p-img">Image URL</Label>
              <Input id="p-img" value={productForm.image_url} onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })} className="mt-1" placeholder="https://..." data-testid="product-image-input" />
            </div>
            <Button onClick={submitProduct} className="w-full bg-gradient-to-r from-blue-500 to-indigo-600" data-testid="product-form-submit">
              {productDialog.mode === 'create' ? 'Create Product' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPanel;