/* eslint-disable react/no-unescaped-entities */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Checkbox } from "./ui/checkbox";
import { useCart } from "../context/CartContext";
import { toast } from "sonner";
import { 
  X, 
  ShoppingCart, 
  CreditCard, 
  Truck, 
  MapPin, 
  Phone,
  Gift,
  Star,
  CheckCircle,
  AlertTriangle,
  Clock,
  Wallet,
  Plus,
  Minus,
  Printer,
  Share2,
  Home
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const EnhancedCheckoutPage = ({ onClose }) => {
  const { user } = useAuth();
  const { cartItems, updateQuantity, removeFromCart, clearCart } = useCart();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    instructions: '',
    deliveryType: 'delivery',
    paymentMethod: 'cod'
  });
  const [userProfile, setUserProfile] = useState(null);
  const [userWallet, setUserWallet] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useWalletBalance, setUseWalletBalance] = useState(false);
  const [showLiveUpdates, setShowLiveUpdates] = useState(true);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [shopWhatsapp, setShopWhatsapp] = useState('918148040148');
  const [paymentConfig, setPaymentConfig] = useState({ mode: 'mock', razorpay_key_id: '' });

  useEffect(() => {
    axios.get(`${API}/config`).then((r) => setShopWhatsapp(r.data.shop_whatsapp)).catch(() => {});
    axios.get(`${API}/payments/config`).then((r) => setPaymentConfig(r.data)).catch(() => {});
  }, []);

  // Dynamically load the Razorpay Checkout script (only when needed)
  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  // Load user profile (auth) and wallet (backend) on mount
  useEffect(() => {
    if (user) {
      setUserProfile({ id: user.id, name: user.name, email: user.email, phone: user.phone });
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || prev.address,
      }));
      axios.get(`${API}/users/${user.id}/wallet`)
        .then(r => setUserWallet({ balance: r.data.balance || 0 }))
        .catch(() => {});
    } else {
      try {
        const profile = JSON.parse(localStorage.getItem('memoriesUserProfile') || '{}');
        if (profile.profileComplete) {
          setUserProfile(profile);
          setFormData(prev => ({
            ...prev,
            name: profile.name || '',
            email: profile.email || '',
            phone: profile.phone || '',
            address: profile.city || prev.address,
          }));
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    }
  }, [user]);

  // Calculate pricing with live updates
  const getItemTotal = (item) => item.price * item.quantity;
  
  const getSubtotal = () => {
    return cartItems.reduce((total, item) => total + getItemTotal(item), 0);
  };

  const getDeliveryCharge = () => {
    const subtotal = getSubtotal();
    if (formData.deliveryType === 'pickup') return 0;
    if (subtotal >= 1000) return 0; // Free delivery over ₹1000
    return 50;
  };

  const getTaxAmount = () => {
    const subtotal = getSubtotal();
    return Math.round(subtotal * 0.18); // 18% GST
  };

  const getWalletDiscount = () => {
    if (!useWalletBalance || !userWallet) return 0;
    const subtotal = getSubtotal();
    return Math.min(userWallet.balance || 0, subtotal);
  };

  const getFinalTotal = () => {
    const subtotal = getSubtotal();
    const delivery = getDeliveryCharge();
    const tax = getTaxAmount();
    const walletDiscount = getWalletDiscount();
    return Math.max(0, subtotal + delivery + tax - walletDiscount);
  };

  // Dynamic messaging based on order type
  const getDeliveryMessage = () => {
    const subtotal = getSubtotal();
    const hasFrames = cartItems.some(item => item.category === 'frames');
    const hasCustomItems = cartItems.some(item => item.customization);
    
    let messages = [];
    
    if (formData.deliveryType === 'pickup') {
      messages.push({
        type: 'info',
        icon: <MapPin className="w-4 h-4" />,
        text: 'Ready for pickup at our Keeranatham Road store'
      });
      
      if (hasCustomItems) {
        messages.push({
          type: 'warning',
          icon: <Clock className="w-4 h-4" />,
          text: 'Custom items require 2-3 working days preparation'
        });
      } else {
        messages.push({
          type: 'success',
          icon: <CheckCircle className="w-4 h-4" />,
          text: 'Standard items ready in 2-4 hours'
        });
      }
    } else {
      if (subtotal >= 1000) {
        messages.push({
          type: 'success',
          icon: <Truck className="w-4 h-4" />,
          text: 'Free home delivery (2-3 business days)'
        });
      } else {
        messages.push({
          type: 'info',
          icon: <Truck className="w-4 h-4" />,
          text: `₹50 delivery charge • Free delivery on orders ≥₹1000`
        });
      }
      
      if (hasFrames) {
        messages.push({
          type: 'info',
          icon: <Gift className="w-4 h-4" />,
          text: 'Frames will be carefully packaged for safe delivery'
        });
      }
    }

    return messages;
  };

  // Order submission: persists to backend, deducts wallet, shows invoice
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.deliveryType === 'delivery' && !formData.address) {
      toast.error('Please provide delivery address');
      return;
    }

    setIsSubmitting(true);

    try {
      const totals = {
        subtotal: getSubtotal(),
        delivery: getDeliveryCharge(),
        tax: getTaxAmount(),
        walletDiscount: getWalletDiscount(),
        final: getFinalTotal(),
      };

      const orderPayload = {
        user_id: user?.id || `guest_${Date.now()}`,
        items: cartItems.map((it) => ({
          product_id: it.productId || it.id,
          name: it.name,
          price: it.price,
          quantity: it.quantity,
          image: it.image,
          category: it.category,
        })),
        total_amount: totals.final,
        delivery_type: formData.deliveryType,
        delivery_address: {
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          address: formData.deliveryType === 'delivery' ? formData.address : '',
          instructions: formData.instructions,
        },
      };

      const res = await axios.post(`${API}/orders`, orderPayload);
      const order = res.data;

      // Deduct from backend wallet if used
      if (useWalletBalance && user && totals.walletDiscount > 0) {
        try {
          await axios.post(`${API}/users/${user.id}/wallet/pay`, null, {
            params: { amount: totals.walletDiscount, order_id: order.id },
          });
        } catch (err) {
          console.error('Wallet payment failed:', err);
        }
      }

      // Online payment (Razorpay) flow
      if (formData.paymentMethod === 'razorpay') {
        await handleRazorpayPayment(order, totals);
        return;
      }

      finalizeOrder(order, totals);
    } catch (error) {
      console.error('Order submission error:', error);
      toast.error(error.response?.data?.detail || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Finalize: snapshot invoice, clear cart, show confirmation
  const finalizeOrder = (order, totals) => {
    setPlacedOrder({
      id: order.id,
      items: cartItems,
      customer: { ...formData },
      totals,
      createdAt: order.created_at,
      pointsEarned: order.points_earned || 0,
    });
    clearCart();
    toast.success('🎉 Order placed successfully!', {
      description: `Order ID: ${order.id.substring(0, 8).toUpperCase()}`,
      duration: 5000,
    });
  };

  // Verify payment with backend, then finalize
  const verifyAndFinalize = async (order, totals, rzpResponse = {}) => {
    try {
      await axios.post(`${API}/payments/verify`, {
        order_id: order.id,
        razorpay_payment_id: rzpResponse.razorpay_payment_id || null,
        razorpay_order_id: rzpResponse.razorpay_order_id || null,
        razorpay_signature: rzpResponse.razorpay_signature || null,
      });
      toast.success('✅ Payment verified!');
      finalizeOrder(order, totals);
    } catch (err) {
      console.error('Payment verification failed:', err);
      toast.error(err.response?.data?.detail || 'Payment verification failed. Please contact support.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Razorpay Checkout: mock mode simulates instant success; production opens the modal
  const handleRazorpayPayment = async (order, totals) => {
    // MOCK MODE: simulate a successful payment so the full flow is testable in-browser
    if (paymentConfig.mode !== 'production' || !paymentConfig.razorpay_key_id) {
      toast.info('Mock payment mode — simulating a successful Razorpay payment...');
      await verifyAndFinalize(order, totals, {});
      return;
    }

    // PRODUCTION MODE: open the real Razorpay Checkout modal
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      toast.error('Failed to load Razorpay. Please try again.');
      setIsSubmitting(false);
      return;
    }

    const options = {
      key: paymentConfig.razorpay_key_id,
      amount: Math.round(totals.final * 100), // paise
      currency: 'INR',
      name: 'Memories',
      description: `Order #${order.id.substring(0, 8).toUpperCase()}`,
      // NOTE: For production, generate an order on Razorpay via a backend endpoint
      // and pass order_id here. Signature is verified by POST /api/payments/verify.
      handler: (response) => {
        verifyAndFinalize(order, totals, response);
      },
      prefill: {
        name: formData.name,
        email: formData.email,
        contact: formData.phone,
      },
      theme: { color: '#e11d48' },
      modal: {
        ondismiss: () => {
          toast.error('Payment cancelled.');
          setIsSubmitting(false);
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', () => {
      toast.error('Payment failed. Please try again.');
      setIsSubmitting(false);
    });
    rzp.open();
  };

  // Share order summary on WhatsApp
  const shareOnWhatsApp = () => {
    if (!placedOrder) return;
    const { id, items, customer, totals } = placedOrder;
    const lines = [
      `*Memories Order Confirmation*`,
      ``,
      `Order ID: ${id.substring(0, 8).toUpperCase()}`,
      `Name: ${customer.name}`,
      `Phone: ${customer.phone}`,
      ``,
      `*Items:*`,
      ...items.map((i) => `• ${i.name} x${i.quantity} = ₹${i.price * i.quantity}`),
      ``,
      `Subtotal: ₹${totals.subtotal}`,
      `Delivery: ${totals.delivery === 0 ? 'FREE' : '₹' + totals.delivery}`,
      `Tax (GST): ₹${totals.tax}`,
      totals.walletDiscount > 0 ? `Wallet: -₹${totals.walletDiscount}` : null,
      `*Total: ₹${totals.final}*`,
      ``,
      `${customer.deliveryType === 'pickup' ? 'Store Pickup at Keeranatham Road' : 'Delivery to: ' + customer.address}`,
    ].filter(Boolean);
    const text = encodeURIComponent(lines.join('\n'));
    window.open(`https://wa.me/${shopWhatsapp}?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  // Print the invoice in an isolated window
  const printInvoice = () => {
    if (!placedOrder) return;
    const { id, items, customer, totals, createdAt } = placedOrder;
    const rows = items
      .map(
        (i) =>
          `<tr><td>${i.name}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">₹${i.price}</td><td style="text-align:right">₹${i.price * i.quantity}</td></tr>`
      )
      .join('');
    const html = `<!doctype html><html><head><title>Invoice ${id.substring(0, 8).toUpperCase()}</title>
      <style>
        body{font-family:Arial,sans-serif;color:#1f2937;padding:32px;max-width:700px;margin:auto}
        h1{color:#e11d48;margin:0}
        .muted{color:#6b7280;font-size:13px}
        table{width:100%;border-collapse:collapse;margin-top:16px}
        th,td{padding:8px;border-bottom:1px solid #e5e7eb;font-size:14px}
        th{text-align:left;background:#fdf2f8}
        .totals td{border:none;padding:4px 8px}
        .grand{font-weight:bold;font-size:16px;border-top:2px solid #111;padding-top:8px}
      </style></head><body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div><h1>Memories</h1><div class="muted">Photo Frames & Custom Gifts<br/>Keeranatham Road, Coimbatore<br/>+91 81480 40148</div></div>
        <div style="text-align:right"><strong>INVOICE</strong><div class="muted">#${id.substring(0, 8).toUpperCase()}<br/>${new Date(createdAt).toLocaleString()}</div></div>
      </div>
      <div style="margin-top:16px"><strong>Bill To:</strong><div class="muted">${customer.name}<br/>${customer.email}<br/>${customer.phone}<br/>${customer.deliveryType === 'pickup' ? 'Store Pickup' : customer.address}</div></div>
      <table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
      <table class="totals" style="margin-top:8px"><tbody>
        <tr><td>Subtotal</td><td style="text-align:right">₹${totals.subtotal}</td></tr>
        <tr><td>Delivery</td><td style="text-align:right">${totals.delivery === 0 ? 'FREE' : '₹' + totals.delivery}</td></tr>
        <tr><td>Tax (GST 18%)</td><td style="text-align:right">₹${totals.tax}</td></tr>
        ${totals.walletDiscount > 0 ? `<tr><td>Wallet Discount</td><td style="text-align:right">-₹${totals.walletDiscount}</td></tr>` : ''}
        <tr class="grand"><td>Total</td><td style="text-align:right">₹${totals.final}</td></tr>
      </tbody></table>
      <p class="muted" style="margin-top:24px;text-align:center">Thank you for shopping with Memories! ❤️</p>
      </body></html>`;
    const w = window.open('', '_blank', 'width=800,height=600');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 400);
    }
  };

  // Invoice / order confirmation screen
  if (placedOrder) {
    const { id, items, customer, totals, pointsEarned } = placedOrder;
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" data-testid="order-confirmation">
        <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 md:p-8 text-center border-b">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-9 h-9 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Order Confirmed!</h1>
            <p className="text-gray-600 mt-1">Thank you, {customer.name}. Your order is placed.</p>
            <Badge className="mt-3 bg-rose-100 text-rose-700" data-testid="order-id-badge">
              Order #{id.substring(0, 8).toUpperCase()}
            </Badge>
          </div>

          <div className="p-6 md:p-8 space-y-4">
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-700">{item.name} <span className="text-gray-400">x{item.quantity}</span></span>
                  <span className="font-medium">₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
            <Separator />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{totals.subtotal}</span></div>
              <div className="flex justify-between"><span>Delivery</span><span>{totals.delivery === 0 ? <span className="text-green-600">FREE</span> : `₹${totals.delivery}`}</span></div>
              <div className="flex justify-between"><span>Tax (GST 18%)</span><span>₹{totals.tax}</span></div>
              {totals.walletDiscount > 0 && (
                <div className="flex justify-between text-green-600"><span>Wallet Discount</span><span>-₹{totals.walletDiscount}</span></div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t"><span>Total</span><span>₹{totals.final}</span></div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-sm">
              <p className="font-medium text-gray-900 mb-1 flex items-center">
                {customer.deliveryType === 'pickup' ? <MapPin className="w-4 h-4 mr-1" /> : <Truck className="w-4 h-4 mr-1" />}
                {customer.deliveryType === 'pickup' ? 'Store Pickup' : 'Home Delivery'}
              </p>
              <p className="text-gray-600">
                {customer.deliveryType === 'pickup'
                  ? 'Ready at our Keeranatham Road store. We will call you when ready.'
                  : customer.address}
              </p>
            </div>

            {pointsEarned > 0 && (
              <div className="bg-yellow-50 rounded-lg p-3 text-sm text-yellow-800 flex items-center">
                <Star className="w-4 h-4 mr-2" /> You earned {pointsEarned} reward points on this order!
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Button onClick={printInvoice} variant="outline" className="w-full" data-testid="print-invoice-button">
                <Printer className="w-4 h-4 mr-2" /> Print Invoice
              </Button>
              <Button onClick={shareOnWhatsApp} className="w-full bg-green-500 hover:bg-green-600" data-testid="whatsapp-share-button">
                <Share2 className="w-4 h-4 mr-2" /> Send Order to Shop
              </Button>
            </div>
            <Button onClick={onClose} variant="ghost" className="w-full" data-testid="continue-shopping-button">
              <Home className="w-4 h-4 mr-2" /> Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2" />
              Your Cart is Empty
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            <p className="text-gray-600 mb-4">Add some beautiful photo frames to get started!</p>
            <Button onClick={onClose}>Continue Shopping</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Secure Checkout</h1>
            <p className="text-gray-600">Review and complete your order</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-3 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
            
            {/* Main Form - Mobile Optimized */}
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
              
              {/* User Profile Integration */}
              {userProfile && (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                        {userProfile.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-green-900">Welcome back, {userProfile.name}!</p>
                        <p className="text-green-700 text-sm">Your profile information has been pre-filled</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                  <CardDescription>We'll use this to contact you about your order</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({...prev, phone: e.target.value}))}
                      placeholder="+91 xxxxx xxxxx"
                      required
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Options */}
              <Card>
                <CardHeader>
                  <CardTitle>Delivery Options</CardTitle>
                  <CardDescription>Choose how you'd like to receive your order</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <RadioGroup 
                    value={formData.deliveryType} 
                    onValueChange={(value) => setFormData(prev => ({...prev, deliveryType: value}))}
                  >
                    <div className="flex items-center space-x-2 p-4 border rounded-lg">
                      <RadioGroupItem value="delivery" id="delivery" />
                      <div className="flex-1">
                        <Label htmlFor="delivery" className="font-medium">Home Delivery</Label>
                        <p className="text-sm text-gray-600">We'll deliver to your doorstep</p>
                      </div>
                      <Truck className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex items-center space-x-2 p-4 border rounded-lg">
                      <RadioGroupItem value="pickup" id="pickup" />
                      <div className="flex-1">
                        <Label htmlFor="pickup" className="font-medium">Store Pickup</Label>
                        <p className="text-sm text-gray-600">Pick up from Keeranatham Road store</p>
                      </div>
                      <MapPin className="w-5 h-5 text-gray-400" />
                    </div>
                  </RadioGroup>

                  {formData.deliveryType === 'delivery' && (
                    <div>
                      <Label htmlFor="address">Delivery Address *</Label>
                      <Textarea
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({...prev, address: e.target.value}))}
                        placeholder="Enter your complete address"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="instructions">Special Instructions</Label>
                    <Textarea
                      id="instructions"
                      value={formData.instructions}
                      onChange={(e) => setFormData(prev => ({...prev, instructions: e.target.value}))}
                      placeholder="Any special requests or delivery instructions"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Dynamic Messages */}
              {showLiveUpdates && (
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {getDeliveryMessage().map((message, index) => (
                        <div 
                          key={index}
                          className={`flex items-center space-x-2 p-3 rounded-lg ${
                            message.type === 'success' ? 'bg-green-50 text-green-800' :
                            message.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
                            'bg-blue-50 text-blue-800'
                          }`}
                        >
                          {message.icon}
                          <span className="text-sm font-medium">{message.text}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payment Method */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup 
                    value={formData.paymentMethod} 
                    onValueChange={(value) => setFormData(prev => ({...prev, paymentMethod: value}))}
                  >
                    <div className="flex items-center space-x-2 p-4 border rounded-lg" data-testid="payment-cod-option">
                      <RadioGroupItem value="cod" id="cod" />
                      <div className="flex-1">
                        <Label htmlFor="cod" className="font-medium">Cash on Delivery</Label>
                        <p className="text-sm text-gray-600">Pay when you receive your order</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 p-4 border rounded-lg" data-testid="payment-razorpay-option">
                      <RadioGroupItem value="razorpay" id="razorpay" />
                      <div className="flex-1">
                        <Label htmlFor="razorpay" className="font-medium">Pay Online (Razorpay)</Label>
                        <p className="text-sm text-gray-600">
                          {paymentConfig.mode === 'production'
                            ? 'UPI, Cards, NetBanking & Wallets'
                            : 'Test mode — simulates a successful payment'}
                        </p>
                      </div>
                      <CreditCard className="w-5 h-5 text-gray-400" />
                    </div>
                    
                    {userWallet && (userWallet.balance > 0) && (
                      <div className="flex items-center space-x-2 p-4 border rounded-lg">
                        <RadioGroupItem value="wallet" id="wallet" />
                        <div className="flex-1">
                          <Label htmlFor="wallet" className="font-medium">Digital Wallet</Label>
                          <p className="text-sm text-gray-600">Available balance: ₹{userWallet.balance}</p>
                        </div>
                        <Wallet className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </RadioGroup>
                  
                  {userWallet && (userWallet.balance > 0) && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="useWallet"
                          checked={useWalletBalance}
                          onCheckedChange={setUseWalletBalance}
                        />
                        <Label htmlFor="useWallet" className="text-sm">
                          Use wallet balance (₹{Math.min(userWallet.balance, getSubtotal())})
                        </Label>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Order Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    
                    {/* Cart Items */}
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {cartItems.map((item) => (
                        <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                            <p className="text-xs text-gray-600">₹{item.price} each</p>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    {/* Pricing Breakdown */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal ({cartItems.length} items)</span>
                        <span>₹{getSubtotal()}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Delivery</span>
                        <span>
                          {getDeliveryCharge() === 0 ? (
                            <span className="text-green-600 font-medium">FREE</span>
                          ) : (
                            `₹${getDeliveryCharge()}`
                          )}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Tax (GST 18%)</span>
                        <span>₹{getTaxAmount()}</span>
                      </div>

                      {useWalletBalance && getWalletDiscount() > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Wallet Discount</span>
                          <span>-₹{getWalletDiscount()}</span>
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>₹{getFinalTotal()}</span>
                    </div>

                    {/* Promotional Messages */}
                    {getSubtotal() >= 1000 && (
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-green-800 text-sm font-medium flex items-center">
                          <Gift className="w-4 h-4 mr-2" />
                          Free delivery applied!
                        </p>
                      </div>
                    )}

                    {getSubtotal() < 1000 && (
                      <div className="bg-yellow-50 p-3 rounded-lg">
                        <p className="text-yellow-800 text-sm flex items-center">
                          <Truck className="w-4 h-4 mr-2" />
                          Add ₹{1000 - getSubtotal()} for free delivery
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-3 pt-4">
                      <Button 
                        onClick={handleSubmit}
                        className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
                        disabled={isSubmitting}
                        data-testid="place-order-button"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 mr-2" />
                            {formData.paymentMethod === 'razorpay' ? 'Pay Now' : 'Place Order'} ₹{getFinalTotal()}
                          </>
                        )}
                      </Button>
                      
                      <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                        <CheckCircle className="w-3 h-3" />
                        <span>100% Secure & Protected</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};