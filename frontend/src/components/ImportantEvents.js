import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Bell, CalendarDays, Cake, Heart, Gift, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const TYPES = ['Birthday', 'Anniversary', 'Wedding', 'Baby', 'Memorable Day', 'Other'];

const iconFor = (type) => {
  if (type === 'Birthday') return <Cake className="w-5 h-5 text-rose-500" />;
  if (type === 'Anniversary' || type === 'Wedding') return <Heart className="w-5 h-5 text-rose-500" />;
  return <Gift className="w-5 h-5 text-rose-500" />;
};

const emptyForm = { title: '', person_name: '', event_type: 'Birthday', event_date: '', notes: '', reminder_days: 7, recurring: true };

export const ImportantEvents = ({ userId }) => {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/users/${userId}/important-events`);
      setEvents(res.data || []);
    } catch (e) {
      toast.error('Could not load your important dates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [userId]);

  const upcoming = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    return [...events].sort((a, b) => {
      const nextDate = (value) => {
        const d = new Date(`${value}T00:00:00`);
        if (a.recurring) d.setFullYear(currentYear);
        return d;
      };
      return nextDate(a.event_date) - nextDate(b.event_date);
    });
  }, [events]);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (event) => {
    setEditingId(event.id);
    setForm({ ...event, reminder_days: event.reminder_days ?? 7, recurring: event.recurring !== false });
    setShowForm(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.person_name.trim() || !form.event_date) {
      toast.error('Please enter the event, person and date.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, reminder_days: Number(form.reminder_days) };
      if (editingId) {
        await axios.put(`${API}/users/${userId}/important-events/${editingId}`, payload);
        toast.success('Important date updated ❤️');
      } else {
        await axios.post(`${API}/users/${userId}/important-events`, payload);
        toast.success('Important date saved ❤️');
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not save the event.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Remove this important date?')) return;
    try {
      await axios.delete(`${API}/users/${userId}/important-events/${id}`);
      setEvents((current) => current.filter((event) => event.id !== id));
      toast.success('Important date removed.');
    } catch (e) {
      toast.error('Could not remove the event.');
    }
  };

  return (
    <div className="space-y-4" data-testid="important-events">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Bell className="w-5 h-5 text-rose-500" /> Important Dates</h3>
          <p className="text-sm text-gray-500 mt-1">Save birthdays, anniversaries and special moments so you never forget.</p>
        </div>
        <Button onClick={openCreate} className="bg-rose-500 hover:bg-rose-600 text-white" data-testid="add-important-event"><Plus className="w-4 h-4 mr-1" /> Add</Button>
      </div>

      {showForm && (
        <Card className="border-rose-200 bg-rose-50/40">
          <CardContent className="p-4">
            <form onSubmit={save} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Event / occasion</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Twins' Birthday" /></div>
                <div><Label>For whom?</Label><Input value={form.person_name} onChange={(e) => setForm({ ...form, person_name: e.target.value })} placeholder="Dheekan & Dhruvan" /></div>
                <div><Label>Type</Label><select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm">{TYPES.map((type) => <option key={type}>{type}</option>)}</select></div>
                <div><Label>Date</Label><Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></div>
              </div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Gift idea, reminder note, favourite colour..." /></div>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.checked })} /> Repeat every year</label>
                <label className="flex items-center gap-2">Remind me <select value={form.reminder_days} onChange={(e) => setForm({ ...form, reminder_days: Number(e.target.value) })} className="h-9 rounded-md border px-2"><option value="1">1 day</option><option value="3">3 days</option><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select> before</label>
              </div>
              <div className="flex gap-2 justify-end"><Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Date'}</Button></div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-rose-500" /></div> : upcoming.length === 0 ? (
        <Card><CardContent className="py-8 text-center"><CalendarDays className="w-10 h-10 mx-auto text-gray-300 mb-2" /><p className="font-medium text-gray-700">No important dates saved yet.</p><p className="text-sm text-gray-500 mt-1">Add one and Memories will keep it safely with your account.</p></CardContent></Card>
      ) : (
        <div className="space-y-2">{upcoming.map((event) => (
          <Card key={event.id} className="border-gray-200"><CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">{iconFor(event.event_type)}</div>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-gray-900">{event.title}</p><Badge variant="secondary">{event.event_type}</Badge></div><p className="text-sm text-gray-600">{event.person_name} · {new Date(`${event.event_date}T00:00:00`).toLocaleDateString()}</p>{event.notes && <p className="text-xs text-gray-400 mt-1 truncate">{event.notes}</p>}</div>
            <Button variant="ghost" size="icon" onClick={() => openEdit(event)} aria-label="Edit important date"><Pencil className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => remove(event.id)} aria-label="Delete important date"><Trash2 className="w-4 h-4 text-red-500" /></Button>
          </CardContent></Card>
        ))}</div>
      )}
    </div>
  );
};

export default ImportantEvents;
