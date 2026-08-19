const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'components', 'AdminPanel.js');
let text = fs.readFileSync(file, 'utf8');

if (!text.includes('import ContentManagement from "./ContentManagement";')) {
  text = text.replace('import { \n', 'import ContentManagement from "./ContentManagement";\nimport { \n');
}

const start = text.indexOf('  const renderContentManagement = () => (');
const end = text.indexOf('\n\n  if (!isAuthenticated)', start);
if (start !== -1 && end !== -1) {
  text = text.slice(0, start) + '  const renderContentManagement = () => <ContentManagement API={API} authConfig={adminAuthConfig} />;' + text.slice(end);
}

fs.writeFileSync(file, text, 'utf8');
console.log('CMS Admin wiring applied at build time.');
