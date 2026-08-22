const fs = require('fs');
const path = require('path');

// Prevent customer-visible flashes of legacy CMS defaults while public CMS data loads.
// This runs after wire-cms-admin.js on every clean build, so the source files remain
// maintainable and the wiring is repeatable.
const bannerFile = path.join(__dirname, '..', 'src', 'components', 'CmsAnnouncementBanner.js');
let bannerText = fs.readFileSync(bannerFile, 'utf8');

bannerText = bannerText.replace(
  'const [text, setText] = useState("");',
  'const [text, setText] = useState("");\n  const [loaded, setLoaded] = useState(false);'
);
bannerText = bannerText.replace(
  'if (!response.ok) return;\n        const data = await response.json();\n        const value = data?.announcement?.announcement_text;\n        if (!cancelled && value) setText(value);',
  'if (!response.ok) { if (!cancelled) setLoaded(true); return; }\n        const data = await response.json();\n        const value = data?.announcement?.announcement_text;\n        if (!cancelled) {\n          if (value) setText(value);\n          setLoaded(true);\n        }'
);
bannerText = bannerText.replace(
  '      } catch (error) {\n        console.warn("CMS announcement load failed", error);\n      }',
  '      } catch (error) {\n        console.warn("CMS announcement load failed", error);\n        if (!cancelled) setLoaded(true);\n      }'
);
bannerText = bannerText.replace(
  'return <span>{text || "🎉 Grand Opening Offer: 25% OFF All Frames + Free Home Delivery! 🎉"}</span>;',
  'if (!loaded || !text) return null;\n  return <span>{text}</span>;'
);
if (bannerText.includes('Grand Opening Offer: 25% OFF All Frames + Free Home Delivery!')) {
  throw new Error('Legacy announcement fallback is still present');
}
fs.writeFileSync(bannerFile, bannerText, 'utf8');

const heroFile = path.join(__dirname, '..', 'src', 'components', 'MainComponents.js');
let heroText = fs.readFileSync(heroFile, 'utf8');

const heroState = 'const [cmsHero, setCmsHero] = useState({ hero_title: \'\', hero_subtitle: \'\', hero_image_url: \'\' });';
if (!heroText.includes(heroState)) throw new Error('CMS hero state not found');
if (!heroText.includes('const [cmsHeroLoaded, setCmsHeroLoaded]')) {
  heroText = heroText.replace(heroState, `${heroState}\n  const [cmsHeroLoaded, setCmsHeroLoaded] = useState(false);`);
}

const oldFetch = `    if (!backend) return undefined;\n    fetch(\`${'${'}backend}/api/cms\`)\n      .then((r) => r.ok ? r.json() : null)\n      .then((data) => { if (!cancelled && data?.homepage) setCmsHero(data.homepage); })\n      .catch(() => {});\n    return () => { cancelled = true; };`;
const newFetch = `    if (!backend) {\n      setCmsHeroLoaded(true);\n      return undefined;\n    }\n    fetch(\`${'${'}backend}/api/cms\`)\n      .then((r) => r.ok ? r.json() : null)\n      .then((data) => {\n        if (!cancelled && data?.homepage) setCmsHero(data.homepage);\n        if (!cancelled) setCmsHeroLoaded(true);\n      })\n      .catch(() => { if (!cancelled) setCmsHeroLoaded(true); });\n    return () => { cancelled = true; };`;
if (heroText.includes(oldFetch)) heroText = heroText.replace(oldFetch, newFetch);

// Reserve the hero space while CMS data is loading, but do not paint the legacy
// title/image/promotion before the CMS response arrives.
const heroSectionClass = 'className="relative min-h-[700px] bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 overflow-hidden"';
const readyHeroSectionClass = 'className={`relative min-h-[700px] bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 overflow-hidden ${cmsHeroLoaded ? "opacity-100" : "opacity-0"}`}';
if (heroText.includes(heroSectionClass) && !heroText.includes(readyHeroSectionClass)) {
  heroText = heroText.replace(heroSectionClass, readyHeroSectionClass);
}

if (!heroText.includes('cmsHeroLoaded')) throw new Error('CMS hero loading guard was not wired');
fs.writeFileSync(heroFile, heroText, 'utf8');

console.log('CMS loading guard applied: no legacy banner/hero flash before public CMS data is ready.');
