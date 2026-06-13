import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

export default defineManifest({
  manifest_version: 3,
  name: '__MSG_extName__',
  description: '__MSG_extDescription__',
  version: pkg.version,
  default_locale: 'en',
  homepage_url: 'https://midvash.app/chrome-extension',
  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
    },
  },
  options_page: 'src/options/index.html',
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
  background: {
    service_worker: 'src/background.ts',
    type: 'module',
  },
  permissions: ['storage', 'alarms', 'activeTab', 'sidePanel'],
  host_permissions: ['https://api.midvash.com/*'],
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
      all_frames: false,
    },
  ],
  web_accessible_resources: [
    {
      resources: ['icons/icon-128.png'],
      matches: ['<all_urls>'],
    },
  ],
});
