const fs = require('fs');
const path = require('path');

// Keep the announcement banner CMS-driven without allowing a sleeping backend to
// block the rest of the homepage. The hero has its own non-blocking cache/fallback
// wiring in wire-cms-admin.js.
const bannerFile = path.join(__dirname, '..', 'src', 'components', 'CmsAnnouncementBanner.js');
let bannerText = fs.readFileSync(bannerFile, 'utf8');

bannerText = bannerText.replace(
  'const [text, setText] = useState("");',
  'const [text, setText] = useState("");\n  const [loaded, setLoaded] = useState(false);'
);

bannerText = bannerText.replace(
  'const load = async () => {\n      try {\n        const response = await fetch(`${API}/cms`, { headers: { Accept: "application/json" } });\n        if (!response.ok) return;\n        const data = await response.json();\n        const value = data?.announcement?.announcement_text;\n        if (!cancelled && value) setText(value);\n      } catch (error) {\n        console.warn("CMS announcement load failed", error);\n      }',
  'const load = async () => {\n      const controller = new AbortController();\n      const timeoutId = setTimeout(() => controller.abort(), 4500);\n      try {\n        const response = await fetch(`${API}/cms`, { headers: { Accept: "application/json" }, cache: "no-store", signal: controller.signal });\n        if (!response.ok) return;\n        const data = await response.json();\n        const value = data?.announcement?.announcement_text;\n        if (!cancelled && value) setText(value);\n      } catch (error) {\n        console.warn("CMS announcement load failed", error);\n      } finally {\n        clearTimeout(timeoutId);\n        if (!cancelled) setLoaded(true);\n      }'
);

bannerText = bannerText.replace(
  'return <span>{text || "🎉 Grand Opening Offer: 25% OFF All Frames + Free Home Delivery! 🎉"}</span>;',
  'if (!loaded || !text) return null;\n  return <span>{text}</span>;'
);

if (bannerText.includes('Grand Opening Offer: 25% OFF All Frames + Free Home Delivery!')) {
  throw new Error('Legacy announcement fallback is still present');
}
if (!bannerText.includes('setLoaded(true)')) throw new Error('CMS announcement loading guard was not wired');

fs.writeFileSync(bannerFile, bannerText, 'utf8');

console.log('CMS loading guard applied: homepage remains responsive while CMS data loads.');
