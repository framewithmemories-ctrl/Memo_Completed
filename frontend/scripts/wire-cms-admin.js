const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'components', 'AdminPanel.js');
let text = fs.readFileSync(file, 'utf8');

if (!text.includes('import ContentManagement from "./ContentManagement";')) {
  const importAnchor = "import {";
  const importIndex = text.indexOf(importAnchor);
  if (importIndex === -1) throw new Error('Unable to find AdminPanel import block');
  text = text.slice(0, importIndex) + 'import ContentManagement from "./ContentManagement";\n' + text.slice(importIndex);
}

const start = text.indexOf('  const renderContentManagement = () => (');
const end = text.indexOf('\n\n  if (!isAuthenticated)', start);
if (start === -1 || end === -1) {
  throw new Error('Unable to locate AdminPanel CMS placeholder block');
}

const replacement = '  const renderContentManagement = () => <ContentManagement API={API} authConfig={adminAuthConfig} />;';
text = text.slice(0, start) + replacement + text.slice(end);

fs.writeFileSync(file, text, 'utf8');

const updated = fs.readFileSync(file, 'utf8');
if (!updated.includes('ContentManagement API={API} authConfig={adminAuthConfig}')) {
  throw new Error('CMS Admin wiring verification failed');
}
console.log('CMS Admin wiring applied and verified.');
