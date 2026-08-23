const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const appPath = path.join(root, 'src', 'App.js');
const mainPath = path.join(root, 'src', 'components', 'MainComponents.js');
const aboutPath = path.join(root, 'src', 'components', 'AboutUsPage.js');
const reviewsPath = path.join(root, 'src', 'components', 'ReviewSystemEnhanced.js');

const PROFILE_URL = 'https://www.google.com/maps/search/?api=1&query=Memories%20Photo%20Frames%20%26%20Customized%20Gift%20Shop%2C%20Coimbatore&query_place_id=ChIJ9dQb1b33qDsRTLJ9I1nkuqo';
const INSTAGRAM_URL = 'https://www.instagram.com/memories.framedwithlove/';
const FACEBOOK_URL = 'https://www.facebook.com/MemoriesFramedwithlove';

function replaceOrFail(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`Audit patch target not found: ${label}`);
  return text.replace(from, to);
}

let app = fs.readFileSync(appPath, 'utf8');
app = app.replace(/https:\/\/instagram\.com\/memories_photoframes/g, INSTAGRAM_URL);
app = app.replace(/https:\/\/facebook\.com\/memories\.photoframes/g, FACEBOOK_URL);
app = app.replace(/https:\/\/www\.google\.com\/maps\/place\/Memories[^']+/g, PROFILE_URL);
app = app.replace(/https:\/\/maps\.google\.com\/\?q=32J2%2BPJ\+Coimbatore,\+Tamil\+Nadu/g, PROFILE_URL);

const oldProducts = `      try {\n        const response = await axios.get(\`${'${'}API}/products\`, { timeout: 6000 });\n        if (!cancelled) setProducts(Array.isArray(response.data) ? response.data : []);\n      } catch (error) {\n        console.error('Error fetching products:', error);\n        if (!cancelled) toast.error("Products are taking longer to load. You can still browse and call us!");\n      } finally {\n        if (!cancelled) setLoading(false);\n      }`;
const newProducts = `      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));\n      let lastError = null;\n      for (let attempt = 0; attempt < 3 && !cancelled; attempt += 1) {\n        try {\n          const response = await axios.get(\`${'${'}API}/products\`, { timeout: 12000, headers: { Accept: 'application/json' } });\n          if (!cancelled) setProducts(Array.isArray(response.data) ? response.data : []);\n          lastError = null;\n          break;\n        } catch (error) {\n          lastError = error;\n          if (attempt < 2) await wait(1500 * (attempt + 1));\n        }\n      }\n      if (lastError && !cancelled) console.warn('Products backend is temporarily unavailable; storefront remains usable.', lastError);\n      if (!cancelled) setLoading(false);`;
app = replaceOrFail(app, oldProducts, newProducts, 'resilient product loading');

const oldPopup = `onClick={() => { document.getElementById('customizer')?.scrollIntoView({behavior: 'smooth'}); setShowPopup(false); }}`;
const newPopup = `onClick={() => { window.dispatchEvent(new CustomEvent('memories:customize-frame')); setShowPopup(false); }}`;
app = replaceOrFail(app, oldPopup, newPopup, 'welcome popup customize action');

const staleOfferBlock = `<div className="bg-gradient-to-r from-rose-50 to-pink-50 p-4 rounded-lg border border-rose-200"><h3 className="font-semibold text-rose-800 mb-2">🎉 Grand Opening Offers!</h3><ul className="text-sm text-rose-700 space-y-1"><li>• 25% OFF on all photo frames</li><li>• Free home delivery</li><li>• Free gift wrapping</li><li>• AI-powered gift recommendations</li></ul></div>`;
app = app.replace(staleOfferBlock, `<div className="bg-rose-50 p-4 rounded-lg border border-rose-100"><p className="text-sm text-rose-800 font-medium">Personalized gifts and photo frames, crafted with care for every occasion.</p></div>`);
app = app.replace('2025 Memories - Photo Frames & Customized Gift Shop', '2026 Memories - Photo Frames & Customized Gift Shop');
app = app.replace('<Badge className="bg-blue-100 text-blue-800"><Truck className="w-3 h-3 mr-1" />Free Delivery</Badge>', '');
fs.writeFileSync(appPath, app, 'utf8');

let main = fs.readFileSync(mainPath, 'utf8');
main = main.replace(/https:\/\/maps\.google\.com\/\?q=32J2%2BPJ\+Coimbatore,\+Tamil\+Nadu/g, PROFILE_URL);
const staleHeroLoader = `  const getInitialCmsHero = () => {\n    if (typeof window === 'undefined') return CMS_DEFAULT_HERO;\n    try {\n      const cached = JSON.parse(window.localStorage.getItem('memories_cms_homepage') || 'null');\n      return cached?.homepage ? { ...CMS_DEFAULT_HERO, ...cached.homepage } : CMS_DEFAULT_HERO;\n    } catch (_) {\n      return CMS_DEFAULT_HERO;\n    }\n  };`;
main = replaceOrFail(main, staleHeroLoader, '  const getInitialCmsHero = () => CMS_DEFAULT_HERO;', 'remove stale homepage CMS cache flash');
fs.writeFileSync(mainPath, main, 'utf8');

let about = fs.readFileSync(aboutPath, 'utf8');
about = about.replace(/const GOOGLE_STORE_DIRECTIONS_URL = `[^`]+`;/, 'const GOOGLE_STORE_DIRECTIONS_URL = GOOGLE_STORE_PROFILE_URL;');
fs.writeFileSync(aboutPath, about, 'utf8');

let reviews = fs.readFileSync(reviewsPath, 'utf8');
const oldLoad = `  const loadGoogleReviews = async () => {\n    setIsLoading(true);\n    try {\n      const response = await axios.get(\`${'${'}API}/google-reviews\`, { timeout: 4500, headers: { Accept: 'application/json' } });\n      setGoogleData(response.data || null);\n    } catch (error) {\n      console.error('Unable to load Google reviews:', error);\n      setGoogleData({ configured: false, error: 'google_reviews_unavailable' });\n    } finally {\n      setIsLoading(false);\n    }\n  };`;
const newLoad = `  const loadGoogleReviews = async () => {\n    setIsLoading(true);\n    let lastError = null;\n    for (let attempt = 0; attempt < 3; attempt += 1) {\n      try {\n        const response = await axios.get(\`${'${'}API}/google-reviews\`, { timeout: 12000, headers: { Accept: 'application/json' } });\n        setGoogleData(response.data || null);\n        lastError = null;\n        break;\n      } catch (error) {\n        lastError = error;\n        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1800 * (attempt + 1)));\n      }\n    }\n    if (lastError) {\n      console.warn('Google reviews are temporarily unavailable; retrying can be done from the section.', lastError);\n      setGoogleData({ configured: false, error: 'google_reviews_unavailable' });\n    }\n    setIsLoading(false);\n  };`;
reviews = replaceOrFail(reviews, oldLoad, newLoad, 'resilient Google review loading');
reviews = reviews.replace('const timer = setTimeout(loadGoogleReviews, 1200);', 'const timer = setTimeout(loadGoogleReviews, 1500);');
fs.writeFileSync(reviewsPath, reviews, 'utf8');

console.log('Site audit wiring applied: social links, Google profile navigation, resilient product/review loading, stale CMS prevention, and outdated promotional claims removed.');
