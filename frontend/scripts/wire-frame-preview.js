const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'src', 'App.js');
let appText = fs.readFileSync(appPath, 'utf8');

const finderPath = path.join(__dirname, '..', 'src', 'components', 'EnhancedAIGiftFinder.js');
let finderText = fs.readFileSync(finderPath, 'utf8');

const previewImport = 'import { FramePreviewCustomizer } from "./components/FramePreviewCustomizer";';
if (!appText.includes(previewImport)) {
  const anchor = 'import { EnhancedAIGiftFinder } from "./components/EnhancedAIGiftFinder";';
  if (!appText.includes(anchor)) {
    throw new Error('EnhancedAIGiftFinder import not found; refusing to wire frame preview.');
  }
  appText = appText.replace(anchor, `${anchor}\n${previewImport}`);
}

if (!appText.includes('<FramePreviewCustomizer />')) {
  if (!appText.includes('<EnhancedAIGiftFinder />')) {
    throw new Error('EnhancedAIGiftFinder render not found; refusing to wire frame preview.');
  }
  appText = appText.replace('<EnhancedAIGiftFinder />', '<EnhancedAIGiftFinder />\n      <FramePreviewCustomizer />');
}

const oldCustomizeHandler = 'onClick={() => document.getElementById(\'customizer\')?.scrollIntoView({behavior: \'smooth\'})}';
const newCustomizeHandler = 'onClick={() => window.dispatchEvent(new CustomEvent(\'memories:customize-frame\', { detail: { suggestion, previewPhoto } }))}';

if (finderText.includes(oldCustomizeHandler)) {
  finderText = finderText.replace(oldCustomizeHandler, newCustomizeHandler);
} else if (!finderText.includes("memories:customize-frame")) {
  throw new Error('AI Gift Finder Customize This handler not found; refusing to modify it.');
}

fs.writeFileSync(appPath, appText, 'utf8');
fs.writeFileSync(finderPath, finderText, 'utf8');
console.log('Frame preview wiring applied: AI Gift Finder Customize This now opens the live framing preview.');
