/* eslint-disable react/no-unescaped-entities */
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Checkbox } from './ui/checkbox';
import { useCart } from '../context/CartContext';
import { toast } from 'sonner';
import { X, ShoppingCart, CreditCard, Truck, MapPin, Gift, Star, CheckCircle, Wallet, Plus, Minus, Printer, Share2, Home } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_frameify-store/artifacts/6aq8xona_LOGO.png';

export const EnhancedCheckoutPage = ({ onClose }) => {
  const { user } = useAuth();
  const { cartItems, updateQuantity, clearCart } = useCart();
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '', instructions: '', deliveryType: 'delivery', paymentMethod: 'cod' });
  const [userProfile, setUserProfile] = useState(null);
  const [userWallet, setUserWallet] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useWalletBalance, setUseWalletBalance] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [shopWhatsapp, setShopWhatsapp] = useState('918148040148');
  const [paymentConfig, setPaymentConfig] = useState({ mode: 'mock', razorpay_key_id: '' });

  useEffect(() => {
    axios.get(`${API}/config`).then((r) => setShopWhatsapp(r.data.shop_whatsapp)).catch(() => {});
    axios.get(`${API}/payments/config`).then((r) => setPaymentConfig(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    setUserProfile(user);
    setFormData((p) => ({ ...p, name: user.name || '', email: user.email || '', phone: user.phone || '', address: user.address || p.address }));
    axios.get(`${API}/users/${user.id}/wallet`).then((r) => setUserWallet({ balance: r.data.balance || 0 })).catch(() => {});
  }, [user]);

  const subtotal = () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const delivery = () => formData.deliveryType === 'pickup' || subtotal() >= 1000 ? 0 : 50;
  const tax = () => Math.round(subtotal() * 0.18);
  const walletDiscount = () => useWalletBalance && userWallet ? Math.min(userWallet.balance || 0, subtotal()) : 0;
  const total = () => Math.max(0, subtotal() + delivery() + tax() - walletDiscount());

  const loadRazorpay = () => new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  const finalizeOrder = (order, totals) => {
    setPlacedOrder({ id: order.id, items: cartItems, customer: { ...formData }, totals, createdAt: order.created_at, pointsEarned: order.points_earned || 0 });
    clearCart();
    toast.success('🎉 Order placed successfully!', { description: `Order ID: ${order.id.substring(0, 8).toUpperCase()}`, duration: 5000 });
  };

  const verifyAndFinalize = async (orderId, totals, response = {}) => {
    try {
      await axios.post(`${API}/payments/verify`, {
        order_id: orderId,
        razorpay_payment_id: response.razorpay_payment_id || null,
        razorpay_order_id: response.razorpay_order_id || null,
        razorpay_signature: response.razorpay_signature || null,
      });
      toast.success('✅ Payment verified!');
      finalizeOrder({ id: orderId, created_at: new Date().toISOString(), points_earned: totals.pointsEarned || 0 }, totals);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Payment verification failed. Please contact support.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRazorpay = async (items, address, totals) => {
    let info;
    try {
      info = (await axios.post(`${API}/payments/create-order`, {
        user_id: user?.id || `guest_${Date.now()}`,
        items,
        delivery_type: formData.deliveryType,
        delivery_address: address,
        use_store_credit: !!(useWalletBalance && user),
      })).data;
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not start payment. Please try again.');
      setIsSubmitting(false);
      return;
    }

    if (info.mode !== 'production' || !info.key_id) {
      toast.info('Mock payment mode — simulating a successful payment...');
      await verifyAndFinalize(info.memories_order_id, totals, {});
      return;
    }

    if (!(await loadRazorpay())) {
      toast.error('Failed to load Razorpay. Please try again.');
      setIsSubmitting(false);
      return;
    }

    const rzp = new window.Razorpay({
      key: info.key_id,
      amount: info.amount,
      currency: info.currency || 'INR',
      order_id: info.razorpay_order_id,
      name: 'Memories',
      description: `Order #${info.memories_order_id.substring(0, 8).toUpperCase()}`,
      prefill: { name: formData.name, email: formData.email, contact: formData.phone },
      theme: { color: '#e11d48' },
      handler: (response) => verifyAndFinalize(info.memories_order_id, totals, response),
      modal: {
        ondismiss: () => {
          toast.error('Payment cancelled.');
          setIsSubmitting(false);
        },
      },
    });

    rzp.on('payment.failed', () => {
      toast.error('Payment failed. Please try again.');
      setIsSubmitting(false);
    });
    rzp.open();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) return toast.error('Please fill in all required fields');
    if (formData.deliveryType === 'delivery' && !formData.address) return toast.error('Please provide delivery address');

    setIsSubmitting(true);
    const totals = { subtotal: subtotal(), delivery: delivery(), tax: tax(), walletDiscount: walletDiscount(), final: total() };
    const items = cartItems.map((it) => ({
      product_id: it.productId || it.id,
      variant_id: it.variantId || null,
      name: it.name,
      price: it.price,
      quantity: it.quantity,
      image: it.image,
      category: it.category,
      customOptions: it.customOptions || {},
    }));
    const address = {
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      address: formData.deliveryType === 'delivery' ? formData.address : '',
      instructions: formData.instructions,
    };

    try {
      if (formData.paymentMethod === 'razorpay') {
        await handleRazorpay(items, address, totals);
        return;
      }

      const order = (await axios.post(`${API}/orders`, {
        user_id: user?.id || `guest_${Date.now()}`,
        items,
        total_amount: totals.final,
        delivery_type: formData.deliveryType,
        delivery_address: address,
      })).data;

      if (useWalletBalance && user && totals.walletDiscount > 0) {
        await axios.post(`${API}/users/${user.id}/wallet/pay`, null, {
          params: { amount: totals.walletDiscount, order_id: order.id },
        }).catch(() => {});
      }

      finalizeOrder(order, totals);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const shareOnWhatsApp = () => {
    if (!placedOrder) return;
    const { id, items, customer, totals } = placedOrder;
    const lines = [
      '*Memories Order Confirmation*',
      '',
      `Order ID: ${id.substring(0, 8).toUpperCase()}`,
      `Name: ${customer.name}`,
      `Phone: ${customer.phone}`,
      '',
      '*Items:*',
      ...items.map((i) => `• ${i.name} x${i.quantity} = ₹${i.price * i.quantity}`),
      '',
      `Subtotal: ₹${totals.subtotal}`,
      `Delivery: ${totals.delivery === 0 ? 'FREE' : '₹' + totals.delivery}`,
      `Tax (GST): ₹${totals.tax}`,
      totals.walletDiscount > 0 ? `Wallet: -₹${totals.walletDiscount}` : null,
      `*Total: ₹${totals.final}*`,
      '',
      customer.deliveryType === 'pickup' ? 'Store Pickup at Keeranatham Road' : `Delivery to: ${customer.address}`,
    ].filter(Boolean);

    window.open(`https://wa.me/${shopWhatsapp}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener,noreferrer');
  };

  const printInvoice = () => {
    if (!placedOrder) return;
    const { id, items, customer, totals, createdAt } = placedOrder;
    const invoiceNo = id.substring(0, 8).toUpperCase();
    const rows = items.map((i) => `<tr><td>${i.name}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">₹${i.price}</td><td style="text-align:right">₹${i.price * i.quantity}</td></tr>`).join('');
    const html = `<!doctype html><html><head><title>Memories Invoice ${invoiceNo}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>
      @page{size:A4;margin:14mm}body{font-family:Arial,sans-serif;color:#1f2937;margin:0;font-size:12px}.sheet{max-width:760px;margin:auto}.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #e11d48;padding-bottom:12px}.brand{display:flex;align-items:center;gap:12px}.logo{width:76px;height:76px;object-fit:contain}.brandname{color:#e11d48;font-size:25px;font-weight:700}.muted{color:#6b7280;font-size:11px;line-height:1.45}.invoice{text-align:right}.invoice strong{font-size:18px;color:#111827}.bill{margin-top:16px}.bill strong{display:block;margin-bottom:4px}.table{width:100%;border-collapse:collapse;margin-top:16px}.table th{background:#fdf2f8;text-align:left}.table th,.table td{padding:7px;border-bottom:1px solid #e5e7eb}.right{text-align:right}.center{text-align:center}.totals{width:48%;margin-left:auto;margin-top:8px;border-collapse:collapse}.totals td{padding:4px}.grand td{font-weight:700;font-size:15px;border-top:2px solid #111;padding-top:7px}.thanks{text-align:center;margin-top:24px;color:#6b7280}.footer{text-align:center;margin-top:10px;font-size:10px;color:#9ca3af}@media print{.sheet{max-width:none}}
      </style></head><body><div class="sheet"><div class="top"><div class="brand"><img class="logo" src="${LOGO_URL}" alt="Memories logo"><div><div class="brandname">Memories</div><div class="muted">Photo Frames & Custom Gifts<br>Keeranatham Road, Coimbatore<br>+91 81480 40148</div></div></div><div class="invoice"><strong>INVOICE</strong><div class="muted">#${invoiceNo}<br>${new Date(createdAt).toLocaleString()}</div></div></div><div class="bill"><strong>Bill To:</strong><div class="muted">${customer.name}<br>${customer.email}<br>${customer.phone}<br>${customer.deliveryType === 'pickup' ? 'Store Pickup' : customer.address}</div></div><table class="table"><thead><tr><th>Item</th><th class="center">Qty</th><th class="right">Price</th><th class="right">Amount</th></tr></thead><tbody>${rows}</tbody></table><table class="totals"><tbody><tr><td>Subtotal</td><td class="right">₹${totals.subtotal}</td></tr><tr><td>Delivery</td><td class="right">${totals.delivery === 0 ? 'FREE' : '₹' + totals.delivery}</td></tr><tr><td>Tax (GST 18%)</td><td class="right">₹${totals.tax}</td></tr>${totals.walletDiscount > 0 ? `<tr><td>Wallet Discount</td><td class="right">-₹${totals.walletDiscount}</td></tr>` : ''}<tr class="grand"><td>Total</td><td class="right">₹${totals.final}</td></tr></tbody></table><div class="thanks">Thank you for shopping with Memories! ❤️</div><div class="footer">Framed with Love and Crafted with Care</div></div></body></html>`;
    const w = window.open('', '_blank', 'width=850,height=700');
    if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 700); }
  };

  if (placedOrder) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 text-center border-b">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3"><CheckCircle className="w-9 h-9 text-green-600" /></div>
            <h1 className="text-2xl font-bold">Order Confirmed!</h1>
            <p className="text-gray-600 mt-1">Thank you, {placedOrder.customer.name}. Your order is placed.</p>
            <Badge className="mt-3 bg-rose-100 text-rose-700">Order #{placedOrder.id.substring(0, 8).toUpperCase()}</Badge>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">{placedOrder.items.map((item) => <div key={item.id} className="flex justify-between text-sm"><span>{item.name} <span className="text-gray-400">x{item.quantity}</span></span><span>₹{item.price * item.quantity}</span></div>)}</div>
            <Separator />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{placedOrder.totals.subtotal}</span></div>
              <div className="flex justify-between"><span>Delivery</span><span>{placedOrder.totals.delivery === 0 ? 'FREE' : `₹${placedOrder.totals.delivery}`}</span></div>
              <div className="flex justify-between"><span>Tax (GST 18%)</span><span>₹{placedOrder.totals.tax}</span></div>
              {placedOrder.totals.walletDiscount > 0 && <div className="flex justify-between text-green-600"><span>Wallet Discount</span><span>-₹{placedOrder.totals.walletDiscount}</span></div>}
              <div className="flex justify-between text-lg font-bold pt-2 border-t"><span>Total</span><span>₹{placedOrder.totals.final}</span></div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-sm">
              <p className="font-medium flex items-center">{placedOrder.customer.deliveryType === 'pickup' ? <MapPin className="w-4 h-4 mr-1" /> : <Truck className="w-4 h-4 mr-1" />}{placedOrder.customer.deliveryType === 'pickup' ? 'Store Pickup' : 'Home Delivery'}</p>
              <p className="text-gray-600">{placedOrder.customer.deliveryType === 'pickup' ? 'Ready at our Keeranatham Road store. We will call you when ready.' : placedOrder.customer.address}</p>
            </div>
            {placedOrder.pointsEarned > 0 && <div className="bg-yellow-50 rounded-lg p-3 text-sm text-yellow-800 flex items-center"><Star className="w-4 h-4 mr-2" />You earned {placedOrder.pointsEarned} reward points!</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button onClick={printInvoice} variant="outline" className="w-full"><Printer className="w-4 h-4 mr-2" /> Print Branded Invoice</Button>
              <Button onClick={shareOnWhatsApp} className="w-full bg-green-500 hover:bg-green-600"><Share2 className="w-4 h-4 mr-2" /> Send Order to Shop</Button>
            </div>
            <Button onClick={onClose} variant="ghost" className="w-full"><Home className="w-4 h-4 mr-2" /> Continue Shopping</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!cartItems.length) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md"><CardHeader><CardTitle className="flex items-center"><ShoppingCart className="w-5 h-5 mr-2" />Your Cart is Empty</CardTitle></CardHeader><CardContent className="text-center py-8"><p className="text-gray-600 mb-4">Add some beautiful photo frames to get started!</p><Button onClick={onClose}>Continue Shopping</Button></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div><h1 className="text-2xl font-bold">Secure Checkout</h1><p className="text-gray-600">Review and complete your order</p></div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>
        <div className="p-3 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
              {userProfile && <Card className="border-green-200 bg-green-50"><CardContent className="p-4"><p className="font-medium text-green-900">Welcome back, {userProfile.name}!</p><p className="text-green-700 text-sm">Your profile information has been pre-filled.</p></CardContent></Card>}
              <Card><CardHeader><CardTitle>Contact Information</CardTitle><CardDescription>We'll use this to contact you about your order</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><Label>Full Name *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div><div><Label>Email Address *</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required /></div></div><div><Label>Phone Number *</Label><Input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required /></div></CardContent></Card>
              <Card><CardHeader><CardTitle>Delivery Options</CardTitle><CardDescription>Choose how you'd like to receive your order</CardDescription></CardHeader><CardContent className="space-y-4"><RadioGroup value={formData.deliveryType} onValueChange={(value) => setFormData({ ...formData, deliveryType: value })}><div className="flex items-center gap-2 p-4 border rounded-lg"><RadioGroupItem value="delivery" id="delivery" /><Label htmlFor="delivery" className="font-medium flex-1">Home Delivery</Label><Truck className="w-5 h-5 text-gray-400" /></div><div className="flex items-center gap-2 p-4 border rounded-lg"><RadioGroupItem value="pickup" id="pickup" /><Label htmlFor="pickup" className="font-medium flex-1">Store Pickup</Label><MapPin className="w-5 h-5 text-gray-400" /></div></RadioGroup>{formData.deliveryType === 'delivery' && <div><Label>Delivery Address *</Label><Textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} required /></div>}<div><Label>Special Instructions</Label><Textarea value={formData.instructions} onChange={(e) => setFormData({ ...formData, instructions: e.target.value })} /></div></CardContent></Card>
              <Card><CardHeader><CardTitle>Payment Method</CardTitle></CardHeader><CardContent><RadioGroup value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}><div className="flex items-center gap-2 p-4 border rounded-lg"><RadioGroupItem value="cod" id="cod" /><Label htmlFor="cod" className="flex-1">Cash on Delivery</Label></div><div className="flex items-center gap-2 p-4 border rounded-lg"><RadioGroupItem value="razorpay" id="razorpay" /><div className="flex-1"><Label htmlFor="razorpay">Pay Online (Razorpay)</Label><p className="text-sm text-gray-500">{paymentConfig.mode === 'production' ? 'UPI, Cards, NetBanking & Wallets' : 'Test mode — simulates a successful payment'}</p></div><CreditCard className="w-5 h-5 text-gray-400" /></div></RadioGroup>{userWallet?.balance > 0 && <div className="mt-4 p-4 bg-gray-50 rounded-lg"><div className="flex items-center gap-2"><Checkbox id="useWallet" checked={useWalletBalance} onCheckedChange={setUseWalletBalance} /><Label htmlFor="useWallet">Use wallet balance (₹{Math.min(userWallet.balance, subtotal())})</Label></div></div>}</CardContent></Card>
            </div>
            <div className="lg:col-span-1"><div className="sticky top-8"><Card><CardHeader><CardTitle className="flex items-center"><ShoppingCart className="w-5 h-5 mr-2" />Order Summary</CardTitle></CardHeader><CardContent className="space-y-4"><div className="space-y-3 max-h-60 overflow-y-auto">{cartItems.map((item) => <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"><img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded" /><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{item.name}</p><p className="text-xs text-gray-600">₹{item.price} each</p></div><div className="flex items-center gap-1"><Button size="sm" variant="outline" onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}><Minus className="w-3 h-3" /></Button><span className="w-7 text-center text-sm">{item.quantity}</span><Button size="sm" variant="outline" onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus className="w-3 h-3" /></Button></div></div>)}</div><Separator /><div className="space-y-2 text-sm"><div className="flex justify-between"><span>Subtotal ({cartItems.length} items)</span><span>₹{subtotal()}</span></div><div className="flex justify-between"><span>Delivery</span><span>{delivery() === 0 ? <span className="text-green-600">FREE</span> : `₹${delivery()}`}</span></div><div className="flex justify-between"><span>Tax (GST 18%)</span><span>₹{tax()}</span></div>{walletDiscount() > 0 && <div className="flex justify-between text-green-600"><span>Wallet Discount</span><span>-₹{walletDiscount()}</span></div>}</div><Separator /><div className="flex justify-between text-lg font-bold"><span>Total</span><span>₹{total()}</span></div>{subtotal() >= 1000 ? <div className="bg-green-50 p-3 rounded-lg text-green-800 text-sm flex items-center"><Gift className="w-4 h-4 mr-2" />Free delivery applied!</div> : <div className="bg-yellow-50 p-3 rounded-lg text-yellow-800 text-sm flex items-center"><Truck className="w-4 h-4 mr-2" />Add ₹{1000 - subtotal()} for free delivery</div>}<Button onClick={handleSubmit} disabled={isSubmitting} className="w-full bg-gradient-to-r from-rose-500 to-pink-500">{isSubmitting ? 'Processing...' : `${formData.paymentMethod === 'razorpay' ? 'Pay Now' : 'Place Order'} ₹${total()}`}</Button><div className="text-xs text-gray-500 text-center flex justify-center items-center gap-1"><CheckCircle className="w-3 h-3" />100% Secure & Protected</div></CardContent></Card></div></div>
          </div>
        </div>
      </div>
    </div>
  );
};
