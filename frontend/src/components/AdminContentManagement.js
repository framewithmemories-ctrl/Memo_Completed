import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Gift, Home, Megaphone, Save } from 'lucide-react';

/**
 * Content-management foundation for the Memories admin.
 * This module is intentionally isolated from the legacy AdminPanel while
 * the CMS API/storefront wiring is completed.
 */
export default function AdminContentManagement() {
  const [active, setActive] = useState('offers');
  const [saved, setSaved] = useState(false);
  const [offer, setOffer] = useState({ title: '', discount: '', active: true });
  const [home, setHome] = useState({ heroTitle: '', heroSubtitle: '', heroImage: '' });
  const [announcement, setAnnouncement] = useState({ text: '', active: true });

  const saveDraft = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const nav = [
    ['offers', Gift, 'Offers'],
    ['homepage', Home, 'Homepage'],
    ['announcement', Megaphone, 'Announcement'],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Content Management</h2>
        <p className="text-gray-500 mt-1">Manage the content that will power the customer storefront.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {nav.map(([key, Icon, label]) => (
          <Button key={key} variant={active === key ? 'default' : 'outline'} onClick={() => setActive(key)}>
            <Icon className="w-4 h-4 mr-2" />{label}
          </Button>
        ))}
      </div>

      {active === 'offers' && (
        <Card>
          <CardHeader><CardTitle>Offers</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Offer title" value={offer.title} onChange={e => setOffer({ ...offer, title: e.target.value })} />
            <Input placeholder="Discount e.g. 25% OFF" value={offer.discount} onChange={e => setOffer({ ...offer, discount: e.target.value })} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={offer.active} onChange={e => setOffer({ ...offer, active: e.target.checked })} /> Active <Badge variant={offer.active ? 'default' : 'secondary'}>{offer.active ? 'Live' : 'Hidden'}</Badge></label>
            <Button onClick={saveDraft}><Save className="w-4 h-4 mr-2" />Save offer</Button>
          </CardContent>
        </Card>
      )}

      {active === 'homepage' && (
        <Card>
          <CardHeader><CardTitle>Homepage</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Hero title" value={home.heroTitle} onChange={e => setHome({ ...home, heroTitle: e.target.value })} />
            <Textarea placeholder="Hero subtitle" value={home.heroSubtitle} onChange={e => setHome({ ...home, heroSubtitle: e.target.value })} />
            <Input placeholder="Hero image URL (upload integration next)" value={home.heroImage} onChange={e => setHome({ ...home, heroImage: e.target.value })} />
            <Button onClick={saveDraft}><Save className="w-4 h-4 mr-2" />Save homepage</Button>
          </CardContent>
        </Card>
      )}

      {active === 'announcement' && (
        <Card>
          <CardHeader><CardTitle>Top Announcement</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Textarea placeholder="Announcement shown at the top of the storefront" value={announcement.text} onChange={e => setAnnouncement({ ...announcement, text: e.target.value })} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={announcement.active} onChange={e => setAnnouncement({ ...announcement, active: e.target.checked })} /> Active</label>
            <Button onClick={saveDraft}><Save className="w-4 h-4 mr-2" />Save announcement</Button>
          </CardContent>
        </Card>
      )}

      {saved && <div className="text-sm text-green-600 font-medium">Draft saved locally. Storefront/database wiring will be connected in the next CMS step.</div>}
    </div>
  );
}
