const fs = require('fs');
const path = require('path');

// Keep the announcement banner CMS-driven without allowing a sleeping backend to
// block the rest of the homepage. The hero now has its own non-blocking cache/fallback
// wiring in wire-cms-admin.js.
const bannerFile = path.join(__dirname, '..', 'src', 'components', 'CmsAnnouncementBanner.js');
let bannerText = fs.readFileSync(bannerFile, 'utf8');

bannerText = bannerText.replace(
  'const [text, setText] = useState("");',
  'const [text, setText] = useState("");\n  const [loaded, setLoaded] = useState(false);'
);

// Do not leave the old promotional fallback in the customer-facing banner.
bannerText = bannerText.replace(
  'return <span>{text || "🎉 Grand Opening Offer: 25% OFF All Frames + Free Home Delivery! 🎉"}</span>;',
  'if (!loaded || !text) return null;\n  return <span>{text}</span>;'
);

// Add a short request timeout so a sleeping Render service cannot hold this small
// banner component in a loading state indefinitely.
if (!bannerText.includes('AbortController')) {
  bannerText = bannerText.replace(
    'const loadAnnouncement = async () => {',
    'const loadAnnouncement = async () => {\n      const controller = new AbortController();\n      const timeoutId = setTimeout(() => controller.abort(), 4500);'
  );
  bannerText = bannerText.replace(
    'const response = await fetch(`${API}/cms/announcement`);',
    'const response = await fetch(`${API}/cms/announcement`, { signal: controller.signal, cache: "no-store" });'
  );
  bannerText = bannerText.replace(
    '      } catch (error) {\n        console.warn("CMS announcement load failed", error);\n      }',
    '      } catch (error) {\n        console.warn("CMS announcement load failed", error);\n      } finally {\n        clearTimeout(timeoutId);\n        if (!cancelled) setLoaded(true);\n      }'
  );
}

if (bannerText.includes('Grand Opening Offer: 25% OFF All Frames + Free Home Delivery!')) {
  throw new Error('Legacy announcement fallback is still present');
}
fs.writeFileSync(bannerFile, bannerText, 'utf8');

console.log('CMS loading guard applied: homepage remains responsive while CMS data loads.');
