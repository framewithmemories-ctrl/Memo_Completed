import React, { useState, useEffect } from 'react';
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { toast } from "sonner";
import { Wallet, CreditCard, Gift, Plus, History, Star, TrendingUp, ArrowUpCircle, ArrowDownCircle, Eye, EyeOff, Coins, Award, ShoppingCart, RefreshCw } from "lucide-react";
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const num = (value, fallback = 0) => { const n = Number(value); return Number.isFinite(n) ? n : fallback; };

export const DigitalWallet = ({ userId, onBalanceUpdate }) => {
  const [walletData, setWalletData] = useState({ balance: 0, rewardPoints: 0, storeCredits: 0, tier: 'Silver', totalSpent: 0 });
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addMoneyAmount, setAddMoneyAmount] = useState('');
  const [showBalance, setShowBalance] = useState(true);
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('all');

  useEffect(() => { if (userId) { loadWalletData(); loadTransactions(); } }, [userId]);

  const loadWalletData = async () => {
    try {
      const res = await axios.get(`${API}/users/${userId}/wallet`);
      const w = res.data && typeof res.data === 'object' ? res.data : {};
      const mapped = { balance: num(w.balance), rewardPoints: num(w.reward_points), storeCredits: num(w.store_credits), tier: w.tier || 'Silver', totalSpent: num(w.total_spent) };
      setWalletData(mapped); onBalanceUpdate?.(mapped);
    } catch (error) { console.error('Error loading wallet data:', error); }
  };

  const loadTransactions = async () => {
    try {
      const res = await axios.get(`${API}/users/${userId}/wallet/transactions`);
      const source = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.transactions) ? res.data.transactions : [];
      setTransactions(source.map((t) => ({ id: t.id, type: t.type, amount: num(t.amount), description: t.description || '', category: t.category, status: t.status || 'completed', isPoints: Boolean(t.is_points), creditEarned: num(t.credit_earned), timestamp: t.created_at })));
    } catch (error) { console.error('Error loading transactions:', error); setTransactions([]); }
  };

  const addMoney = async (amount) => {
    if (!amount || amount <= 0) return toast.error('Please enter a valid amount');
    setIsLoading(true);
    try {
      const res = await axios.post(`${API}/users/${userId}/wallet/add-money`, null, { params: { amount: parseFloat(amount) } });
      toast.success(`₹${amount} added to your wallet successfully! 💰`, { description: `New balance: ₹${num(res.data?.new_balance)}`, duration: 4000 });
      setAddMoneyAmount(''); await loadWalletData(); await loadTransactions();
    } catch (error) { console.error('Error adding money:', error); toast.error(error.response?.data?.detail || 'Failed to add money. Please try again.'); }
    finally { setIsLoading(false); }
  };

  const convertPointsToCredits = async (points) => {
    try { const res = await axios.post(`${API}/users/${userId}/wallet/convert-points`, null, { params: { points } }); toast.success(`✨ Converted ${points} points to ₹${num(res.data?.credit_earned)} store credit!`); await loadWalletData(); await loadTransactions(); }
    catch (error) { console.error('Error converting points:', error); toast.error(error.response?.data?.detail || 'Failed to convert points'); }
  };

  const getTierColor = (tier) => tier === 'Platinum' ? 'bg-gray-800 text-white' : tier === 'Gold' ? 'bg-yellow-500 text-white' : 'bg-gray-400 text-white';
  const getTransactionIcon = (transaction) => {
    switch (transaction.category) { case 'topup': return <ArrowUpCircle className="w-4 h-4 text-green-600" />; case 'purchase': return <ShoppingCart className="w-4 h-4 text-blue-600" />; case 'rewards': return <Star className="w-4 h-4 text-yellow-600" />; case 'conversion': return <RefreshCw className="w-4 h-4 text-purple-600" />; default: return <ArrowDownCircle className="w-4 h-4 text-gray-600" />; }
  };

  const filterTransactionsByTime = (source) => {
    const safe = Array.isArray(source) ? source : [];
    if (selectedTimeFilter === 'all') return safe;
    const now = new Date(); let filterDate = new Date();
    switch (selectedTimeFilter) { case 'week': filterDate.setDate(now.getDate() - 7); break; case 'month': filterDate.setMonth(now.getMonth() - 1); break; case '3months': filterDate.setMonth(now.getMonth() - 3); break; default: return safe; }
    return safe.filter(txn => new Date(txn.timestamp) >= filterDate);
  };
  const filteredTransactions = filterTransactionsByTime(transactions);

  return (
    <div className="space-y-6">
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50"><CardHeader><div className="flex items-center justify-between"><div><CardTitle className="flex items-center"><Wallet className="w-5 h-5 text-green-600 mr-2" />My Wallet</CardTitle><CardDescription>Manage your balance, rewards, and store credits</CardDescription></div><div className="flex items-center space-x-2"><Badge className={getTierColor(walletData.tier)}><Award className="w-3 h-3 mr-1" />{walletData.tier} Member</Badge><Button variant="ghost" size="sm" onClick={() => setShowBalance(!showBalance)}>{showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</Button></div></div></CardHeader><CardContent><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div className="text-center p-4 bg-white rounded-lg border border-green-200"><div className="flex items-center justify-center mb-2"><Wallet className="w-6 h-6 text-green-600 mr-2" /><span className="font-medium text-gray-700">Wallet Balance</span></div><div className="text-3xl font-bold text-green-600">{showBalance ? `₹${num(walletData.balance).toFixed(2)}` : '₹•••••'}</div></div><div className="text-center p-4 bg-white rounded-lg border border-yellow-200"><div className="flex items-center justify-center mb-2"><Star className="w-6 h-6 text-yellow-600 mr-2" /><span className="font-medium text-gray-700">Reward Points</span></div><div className="text-3xl font-bold text-yellow-600">{showBalance ? num(walletData.rewardPoints) : '•••••'}</div><p className="text-xs text-gray-500 mt-1">= ₹{((num(walletData.rewardPoints) / 100) * 10).toFixed(2)} value</p></div><div className="text-center p-4 bg-white rounded-lg border border-purple-200"><div className="flex items-center justify-center mb-2"><Gift className="w-6 h-6 text-purple-600 mr-2" /><span className="font-medium text-gray-700">Store Credits</span></div><div className="text-3xl font-bold text-purple-600">{showBalance ? `₹${num(walletData.storeCredits).toFixed(2)}` : '₹•••••'}</div></div></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6"><Dialog><DialogTrigger asChild><Button className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600" data-testid="wallet-add-money-open"><Plus className="w-4 h-4 mr-2" />Add Money</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Add Money to Wallet</DialogTitle><DialogDescription>Top up your wallet for quick and secure payments</DialogDescription></DialogHeader><div className="space-y-4"><div><label className="block text-sm font-medium text-gray-700 mb-2">Amount (₹)</label><Input type="number" placeholder="Enter amount" value={addMoneyAmount} onChange={(e) => setAddMoneyAmount(e.target.value)} min="1" data-testid="wallet-add-amount-input" /></div><div className="grid grid-cols-3 gap-2">{[500,1000,2000].map(amount=><Button key={amount} variant="outline" size="sm" onClick={()=>setAddMoneyAmount(amount.toString())}>₹{amount}</Button>)}</div><Button onClick={()=>addMoney(addMoneyAmount)} disabled={isLoading||!addMoneyAmount} className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600" data-testid="wallet-add-money-submit">{isLoading?<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Processing...</>:<><CreditCard className="w-4 h-4 mr-2" />Add Money</>}</Button></div></DialogContent></Dialog>
      <Dialog><DialogTrigger asChild><Button variant="outline" className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"><Coins className="w-4 h-4 mr-2" />Convert Points</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Convert Reward Points</DialogTitle><DialogDescription>Convert your reward points to store credits (100 points = ₹10)</DialogDescription></DialogHeader><div className="space-y-4"><div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200"><div className="flex justify-between items-center"><span className="text-sm text-gray-700">Available Points:</span><span className="font-semibold text-yellow-600">{num(walletData.rewardPoints)}</span></div><div className="flex justify-between items-center mt-2"><span className="text-sm text-gray-700">Conversion Value:</span><span className="font-semibold text-green-600">₹{((num(walletData.rewardPoints)/100)*10).toFixed(2)}</span></div></div>{num(walletData.rewardPoints)>=100?<div className="space-y-3">{[100,500,1000].filter(points=>points<=num(walletData.rewardPoints)).map(points=><Button key={points} variant="outline" className="w-full justify-between" onClick={()=>convertPointsToCredits(points)}><span>Convert {points} points</span><span className="text-green-600">+₹{((points/100)*10).toFixed(0)}</span></Button>)}</div>:<p className="text-sm text-gray-600 text-center py-4">You need at least 100 points to convert to store credits</p>}</div></DialogContent></Dialog><Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50"><TrendingUp className="w-4 h-4 mr-2" />Spending Stats</Button></div></CardContent></Card>

      <Card className="border-blue-200"><CardHeader><div className="flex items-center justify-between"><div><CardTitle className="flex items-center"><History className="w-5 h-5 text-blue-600 mr-2" />Transaction History</CardTitle><CardDescription>{filteredTransactions.length} transactions</CardDescription></div><select value={selectedTimeFilter} onChange={(e)=>setSelectedTimeFilter(e.target.value)} className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"><option value="all">All Time</option><option value="week">Last 7 Days</option><option value="month">Last Month</option><option value="3months">Last 3 Months</option></select></div></CardHeader><CardContent>{filteredTransactions.length===0?<div className="text-center py-8"><History className="w-16 h-16 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-semibold text-gray-900 mb-2">No transactions yet</h3><p className="text-gray-600">Start using your wallet to see transaction history here</p></div>:<div className="space-y-3">{filteredTransactions.slice(0,10).map((transaction)=><div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"><div className="flex items-center space-x-3">{getTransactionIcon(transaction)}<div><p className="font-medium text-gray-900 text-sm">{transaction.description}</p><p className="text-xs text-gray-600">{new Date(transaction.timestamp).toLocaleDateString()} at {new Date(transaction.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</p></div></div><div className="text-right"><p className={`font-semibold text-sm ${transaction.type==='credit'?'text-green-600':transaction.type==='debit'?'text-red-600':'text-blue-600'}`}>{transaction.type==='credit'?'+':transaction.type==='debit'?'-':''}{transaction.isPoints?`${transaction.amount} pts`:`₹${transaction.amount}`}</p>{transaction.creditEarned>0&&<p className="text-xs text-green-600">+₹{transaction.creditEarned} credit</p>}<Badge variant={transaction.status==='completed'?'default':'secondary'} className="text-xs">{transaction.status}</Badge></div></div>)}{filteredTransactions.length>10&&<div className="text-center pt-4"><Button variant="outline" size="sm">View All Transactions</Button></div>}</div>}</CardContent></Card>
    </div>
  );
};

DigitalWallet.useWalletForPayment = (userId, amount, orderId) => { console.log('Wallet payment function called', { userId, amount, orderId }); };
DigitalWallet.addRewardPoints = (userId, points, reason) => { console.log('Add reward points function called', { userId, points, reason }); };