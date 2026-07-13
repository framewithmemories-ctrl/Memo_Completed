import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Gift, Sparkles, Building2, Home, Star, ChevronDown } from 'lucide-react';

// Each sub-item maps to one of the real Shop filter categories:
// 'All' | 'Frames' | 'Mugs' | 'T-Shirts' | 'Acrylic' | 'Corporate'
const MENU = [
  {
    title: 'Photo Frames & Prints',
    icon: ImageIcon,
    items: [
      ['Personalized Photo Frames', 'Frames'],
      ['Collage Frames', 'Frames'],
      ['LED / Light-up Frames', 'Acrylic'],
      ['Wooden / Acrylic Frames', 'Acrylic'],
      ['Wall Photo Frames', 'Frames'],
      ['Desk Frames', 'Frames'],
    ],
  },
  {
    title: 'Photo Gifts',
    icon: Gift,
    items: [
      ['Photo Mugs', 'Mugs'],
      ['Photo Pillows / Cushions', 'All'],
      ['Photo Keychains', 'All'],
      ['Photo Bottles / Sippers', 'All'],
      ['Photo Clocks', 'All'],
      ['Photo Lamps', 'All'],
    ],
  },
  {
    title: 'Occasion-Based Gifts',
    icon: Sparkles,
    items: [
      ['Birthday Gifts', 'All'],
      ['Anniversary Gifts', 'All'],
      ['Wedding Gifts', 'All'],
      ['Friendship / Love Gifts', 'All'],
      ['Festival Specials', 'All'],
    ],
  },
  {
    title: 'Corporate & Bulk Orders',
    icon: Building2,
    items: [
      ['Employee Awards & Frames', 'Corporate'],
      ['Corporate Gift Hampers', 'Corporate'],
      ['Bulk T-Shirts', 'T-Shirts'],
    ],
  },
  {
    title: 'Home & Lifestyle',
    icon: Home,
    items: [
      ['Wall Décor', 'All'],
      ['Name Plates', 'All'],
      ['Custom Mugs', 'Mugs'],
    ],
  },
  {
    title: 'Specials',
    icon: Star,
    items: [
      ['Kids Collection', 'All'],
      ['Couple Gifts', 'All'],
      ['Custom T-Shirts', 'T-Shirts'],
    ],
  },
];

export const ShopMegaMenu = () => {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);

  const openMenu = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };

  // Small delay prevents flicker when moving the cursor from the trigger to the panel
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 160);
  };

  const handleSelect = (category) => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent('shop-filter', { detail: { category } }));
    setTimeout(() => {
      document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  };

  return (
    <div
      className="relative"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
      data-testid="shop-mega-wrapper"
    >
      <button
        type="button"
        className="flex items-center text-gray-700 hover:text-rose-600 font-medium transition-colors relative group focus:outline-none"
        onClick={() => handleSelect('All')}
        aria-haspopup="true"
        aria-expanded={open}
        data-testid="shop-menu-trigger"
      >
        Shop
        <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${open ? 'rotate-180' : ''}`} />
        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-rose-600 transition-all group-hover:w-full"></span>
      </button>

      {open && (
        <div
          className="fixed left-0 right-0 top-[64px] md:top-[72px] z-40"
          onMouseEnter={openMenu}
          onMouseLeave={scheduleClose}
          data-testid="shop-mega-panel"
        >
          <div className="mx-auto max-w-7xl px-6">
            <div className="bg-white rounded-2xl shadow-2xl border border-rose-100 p-8 mt-2 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-10 gap-y-8">
                {MENU.map((col) => {
                  const Icon = col.icon;
                  return (
                    <div key={col.title}>
                      <div className="flex items-center gap-2 pb-2 mb-3 border-b border-gray-100">
                        <Icon className="w-5 h-5 text-rose-500" />
                        <h4 className="font-semibold text-gray-900">{col.title}</h4>
                      </div>
                      <ul className="space-y-2">
                        {col.items.map(([label, category]) => (
                          <li key={label}>
                            <button
                              type="button"
                              onClick={() => handleSelect(category)}
                              className="text-sm text-gray-600 hover:text-rose-600 hover:translate-x-1 transition-all text-left w-full"
                              data-testid={`shop-mega-item-${label.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}`}
                            >
                              {label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopMegaMenu;
