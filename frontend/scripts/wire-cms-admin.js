const fs = require('fs');
const path = require('path');

// Admin CMS wiring
const adminFile = path.join(__dirname, '..', 'src', 'components', 'AdminPanel.js');
let adminText = fs.readFileSync(adminFile, 'utf8');

if (!adminText.includes('import ContentManagement from "./ContentManagement";')) {
  const importAnchor = "import {";
  const importIndex = adminText.indexOf(importAnchor);
  if (importIndex === -1) throw new Error('Unable to find AdminPanel import block');
  adminText = adminText.slice(0, importIndex) + 'import ContentManagement from "./ContentManagement";\n' + adminText.slice(importIndex);
}

const start = adminText.indexOf('  const renderContentManagement = () => (');
const end = adminText.indexOf('\n\n  if (!isAuthenticated)', start);
if (start === -1 || end === -1) {
  throw new Error('Unable to locate AdminPanel CMS placeholder block');
}

const replacement = '  const renderContentManagement = () => <ContentManagement API={API} authConfig={adminAuthConfig} />;';
adminText = adminText.slice(0, start) + replacement + adminText.slice(end);

fs.writeFileSync(adminFile, adminText, 'utf8');

const updatedAdmin = fs.readFileSync(adminFile, 'utf8');
if (!updatedAdmin.includes('ContentManagement API={API} authConfig={adminAuthConfig}')) {
  throw new Error('CMS Admin wiring verification failed');
}

// Customer-facing announcement banner wiring.
// The existing hero banner is preserved visually, but its text is now supplied by the public CMS endpoint.
const heroFile = path.join(__dirname, '..', 'src', 'components', 'MainComponents.js');
let heroText = fs.readFileSync(heroFile, 'utf8');

if (!heroText.includes('import CmsAnnouncementBanner from "./CmsAnnouncementBanner";')) {
  const importAnchor = 'import { Button } from "./ui/button";';
  const importIndex = heroText.indexOf(importAnchor);
  if (importIndex === -1) throw new Error('Unable to find MainComponents import block');
  heroText = heroText.slice(0, importIndex) + 'import CmsAnnouncementBanner from "./CmsAnnouncementBanner";\n' + heroText.slice(importIndex);
}

const legacyBanner = '<span>🎉 Grand Opening Offer: 25% OFF All Frames + Free Home Delivery! 🎉</span>';
if (heroText.includes(legacyBanner)) {
  heroText = heroText.replace(legacyBanner, '<CmsAnnouncementBanner />');
}

if (!heroText.includes('<CmsAnnouncementBanner />')) {
  throw new Error('CMS announcement banner wiring verification failed');
}

fs.writeFileSync(heroFile, heroText, 'utf8');
console.log('CMS Admin and customer announcement wiring applied and verified.');
