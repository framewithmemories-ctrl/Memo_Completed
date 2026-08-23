const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const appPath = path.join(root, 'src', 'App.js');
const mainPath = path.join(root, 'src', 'components', 'MainComponents.js');

const PROFILE_URL = 'https://www.google.com/maps/search/?api=1&query=Memories%20Photo%20Frames%20%26%20Customized%20Gift%20Shop%2C%20Coimbatore&query_place_id=ChIJ9dQb1b33qDsRTLJ9I1nkuqo';
const INSTAGRAM_URL = 'https://www.instagram.com/memories.framedwithlove/';
const FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=100073320994935';

let app = fs.readFileSync(appPath, 'utf8');
app = app.replace(/https:\/\/instagram\.com\/memories_photoframes/g, INSTAGRAM_URL);
app = app.replace(/https:\/\/www\.facebook\.com\/MemoriesFramedwithlove/g, FACEBOOK_URL);
app = app.replace(/https:\/\/facebook\.com\/memories\.photoframes/g, FACEBOOK_URL);
app = app.replace(/https:\/\/www\.facebook\.com\/memories\.photoframes/g, FACEBOOK_URL);
app = app.replace(/https:\/\/www\.facebook\.com\/profile\.php\?id=100073320994935/g, FACEBOOK_URL);
app = app.replace(/https:\/\/www\.google\.com\/maps\/place\/Memories[^']+/g, PROFILE_URL);
app = app.replace(/https:\/\/maps\.google\.com\/\?q=32J2%2BPJ\+Coimbatore,\+Tamil\+Nadu/g, PROFILE_URL);

const oldPopup = `onClick={() => { document.getElementById('customizer')?.scrollIntoView({behavior: 'smooth'}); setShowPopup(false); }}`;
const newPopup = `onClick={() => { window.dispatchEvent(new CustomEvent('memories:customize-frame')); setShowPopup(false); }}`;
if (app.includes(oldPopup)) app = app.replace(oldPopup, newPopup);

const staleOfferBlock = `<div className="bg-gradient-to-r from-rose-50 to-pink-50 p-4 rounded-lg border border-rose-200"><h3 className="font-semibold text-rose-800 mb-2">🎉 Grand Opening Offers!</h3><ul className="text-sm text-rose-700 space-y-1"><li>• 25% OFF on all photo frames</li><li>• Free home delivery</li><li>• Free gift wrapping</li><li>• AI-powered gift recommendations</li></ul></div>`;
app = app.replace(staleOfferBlock, `<div className="bg-rose-50 p-4 rounded-lg border border-rose-100"><p className="text-sm text-rose-800 font-medium">Personalized gifts and photo frames, crafted with care for every occasion.</p></div>`);
app = app.replace('2025 Memories - Photo Frames & Customized Gift Shop', '2026 Memories - Photo Frames & Customized Gift Shop');
app = app.replace('<Badge className="bg-blue-100 text-blue-800"><Truck className="w-3 h-3 mr-1" />Free Delivery</Badge>', '');
fs.writeFileSync(appPath, app, 'utf8');

let main = fs.readFileSync(mainPath, 'utf8');
main = main.replace(/https:\/\/maps\.google\.com\/\?q=32J2%2BPJ\+Coimbatore,\+Tamil\+Nadu/g, PROFILE_URL);
const staleHeroLoader = `  const getInitialCmsHero = () => {\n    if (typeof window === 'undefined') return CMS_DEFAULT_HERO;\n    try {\n      const cached = JSON.parse(window.localStorage.getItem('memories_cms_homepage') || 'null');\n      return cached?.homepage ? { ...CMS_DEFAULT_HERO, ...cached.homepage } : CMS_DEFAULT_HERO;\n    } catch (_) {\n      return CMS_DEFAULT_HERO;\n    }\n  };`;
if (main.includes(staleHeroLoader)) main = main.replace(staleHeroLoader, '  const getInitialCmsHero = () => CMS_DEFAULT_HERO;');
fs.writeFileSync(mainPath, main, 'utf8');

console.log('Site audit wiring applied: verified Facebook page, Instagram page, Google profile navigation, stale CMS prevention, outdated promotional claims, and welcome-popup customize action.');
