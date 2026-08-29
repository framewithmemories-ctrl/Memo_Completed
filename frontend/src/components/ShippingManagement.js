import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { RefreshCw, Plus, Truck, MapPin, Package, Settings2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const authConfig = () => {
  let token = '';
  try { token = JSON.parse(localStorage.getItem('adminAuth') || '{}').token || ''; } catch (e) {}
  return { headers: { Authorization: `Bearer ${token}` } };
};

const PROVIDERS = [
  { key: 'manual', name: 'Manual Shipping', description: 'Local delivery, pickup, Porter or any courier arranged manually.' },
  { key: 'shiprocket', name: 'Shiprocket', description: 'Ready for API credentials and live rate/AWB integration.' },
  { key: 'delhivery', name: 'Delhivery', description: 'Ready for API credentials and live rate/AWB integration.' },
];

export const ShippingManagement = () => {
  const [config, setConfig] = useState({ providers: {}, free_shipping_threshold: 0, default_shipping_charge: 0 });
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [manualOrderId, setManualOrderId] = useState('');
  const [manualAwb, setManualAwb] = useState('');
  const [manualProvider, setManualProvider] = useState('manual');

  const load = async () => {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([
        axios.get(`${API}/admin/shipping/config`, authConfig()),
        axios.get(`${API}/admin/shipping/shipments`, authConfig()),
      ]);
      setConfig(c.data || {});
      setShipments(s.data?.shipments || []);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to load shipping data');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggleProvider = async (key) => {
    const next = { ...(config.providers || {}), [key]: { ...(config.providers?.[key] || {}), enabled: !config.providers?.[key]?.enabled } };
    try {
      const res = await axios.put(`${API}/admin/shipping/config`, { ...config, providers: next }, authConfig());
      setConfig(res.data);
      toast.success(`${PROVIDERS.find(p => p.key === key)?.name} ${next[key].enabled ? 'enabled' : 'disabled'}`);
    } catch (e) { toast.error(e.response?.data?.detail || 'Unable to update provider'); }
  };

  const saveRates = async () => {
    try {
      const res = await axios.put(`${API}/admin/shipping/config`, {
        ...config,
        default_shipping_charge: Number(config.default_shipping_charge || 0),
        free_shipping_threshold: Number(config.free_shipping_threshold || 0),
      }, authConfig());
      setConfig(res.data);
      toast.success('Shipping settings saved');
    } catch (e) { toast.error(e.response?.data?.detail || 'Unable to save shipping settings'); }
  };

  const createManualShipment = async () => {
    if (!manualOrderId.trim()) { toast.error('Enter an order ID'); return; }
    try {
      await axios.post(`${API}/admin/shipping/shipments/manual`, {
        order_id: manualOrderId.trim(), provider: manualProvider, awb_number: manualAwb.trim() || null,
      }, authConfig());
      toast.success('Shipment created');
      setManualOrderId(''); setManualAwb('');
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Unable to create shipment'); }
  };

  const updateStatus = async (shipment, status) => {
    try {
      await axios.patch(`${API}/admin/shipping/shipments/${shipment.id}/status`, { status }, authConfig());
      toast.success('Shipment status updated');
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Unable to update shipment'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-gray-900">Shipping Management</h2><p className="text-sm text-gray-500 mt-1">Shipping foundation for Manual, Shiprocket and Delhivery integrations.</p></div>
        <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
      </div>

      <Card><CardHeader><CardTitle className="flex items-center"><Truck className="w-5 h-5 mr-2" />Shipping Providers</CardTitle><CardDescription>Connect courier APIs later without changing checkout architecture.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-3">
        {PROVIDERS.map(p => { const enabled = !!config.providers?.[p.key]?.enabled; return <div key={p.key} className="rounded-lg border p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{p.name}</p><p className="text-xs text-gray-500 mt-1">{p.description}</p></div><Badge variant={enabled ? 'default' : 'secondary'}>{enabled ? 'Enabled' : 'Disabled'}</Badge></div><Button className="mt-4 w-full" variant="outline" onClick={() => toggleProvider(p.key)}>{enabled ? 'Disable' : 'Enable'}</Button></div>; })}
      </CardContent></Card>

      <Card><CardHeader><CardTitle className="flex items-center"><Settings2 className="w-5 h-5 mr-2" />Shipping Rates</CardTitle><CardDescription>Server-side defaults used by the future checkout shipping engine.</CardDescription></CardHeader><CardContent><div className="grid gap-4 md:grid-cols-2"><div><Label>Default shipping charge (₹)</Label><Input type="number" min="0" value={config.default_shipping_charge ?? 0} onChange={e => setConfig({ ...config, default_shipping_charge: e.target.value })} className="mt-1" /></div><div><Label>Free shipping above (₹)</Label><Input type="number" min="0" value={config.free_shipping_threshold ?? 0} onChange={e => setConfig({ ...config, free_shipping_threshold: e.target.value })} className="mt-1" /></div></div><Button className="mt-4" onClick={saveRates}>Save Shipping Settings</Button></CardContent></Card>

      <Card><CardHeader><CardTitle className="flex items-center"><Plus className="w-5 h-5 mr-2" />Create Manual Shipment</CardTitle><CardDescription>Useful now for local delivery, customer pickup and any courier until API integrations are enabled.</CardDescription></CardHeader><CardContent><div className="grid gap-4 md:grid-cols-3"><div><Label>Order ID *</Label><Input value={manualOrderId} onChange={e => setManualOrderId(e.target.value)} placeholder="Order ID" className="mt-1" /></div><div><Label>Provider</Label><select value={manualProvider} onChange={e => setManualProvider(e.target.value)} className="w-full mt-1 border rounded-md px-3 py-2 text-sm"><option value="manual">Manual Shipping</option><option value="shiprocket">Shiprocket</option><option value="delhivery">Delhivery</option></select></div><div><Label>AWB / Tracking number</Label><Input value={manualAwb} onChange={e => setManualAwb(e.target.value)} placeholder="Optional" className="mt-1" /></div></div><Button className="mt-4" onClick={createManualShipment}><Package className="w-4 h-4 mr-2" />Create Shipment</Button></CardContent></Card>

      <Card><CardHeader><CardTitle>Shipment Queue</CardTitle><CardDescription>Track every shipment independently from the order status.</CardDescription></CardHeader><CardContent>{shipments.length === 0 ? <p className="py-8 text-center text-sm text-gray-500">No shipments yet.</p> : <div className="space-y-3">{shipments.map(s => <div key={s.id} className="rounded-lg border p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">Order #{String(s.order_id).slice(0, 8).toUpperCase()}</p><p className="text-sm text-gray-500">{s.customer_name || 'Customer'} · {s.provider || 'manual'}{s.awb_number ? ` · AWB ${s.awb_number}` : ''}</p></div><Badge>{s.status}</Badge></div><div className="mt-3 flex flex-wrap gap-2"><select value={s.status} onChange={e => updateStatus(s, e.target.value)} className="border rounded-md px-3 py-2 text-sm"><option value="pending">Pending</option><option value="ready">Ready</option><option value="picked_up">Picked Up</option><option value="in_transit">In Transit</option><option value="out_for_delivery">Out for Delivery</option><option value="delivered">Delivered</option><option value="failed">Failed</option><option value="cancelled">Cancelled</option></select>{s.tracking_url && <Button variant="outline" onClick={() => window.open(s.tracking_url, '_blank', 'noopener,noreferrer')}><MapPin className="w-4 h-4 mr-2" />Track</Button>}</div></div>)}</div>}</CardContent></Card>
    </div>
  );
};

export default ShippingManagement;
