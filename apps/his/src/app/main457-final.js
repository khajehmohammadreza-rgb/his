import { jsx as _jsx } from '../client-vendor/react-jsx-runtime.js?b=r24-514-1405';
import { StrictMode } from '../client-vendor/react.js?b=r24-514-1405';
import { createRoot } from '../client-vendor/react-dom-client.js?b=r24-514-1405';
import App from './App457-final.js?b=r25-514-1405';
import { ErrorBoundary } from './ErrorBoundary.js?b=r24-514-1405';

function ensureRootNode() {
  let rootNode = document.getElementById('root');
  if (!rootNode) {
    rootNode = document.createElement('div');
    rootNode.id = 'root';
    (document.body || document.documentElement).prepend(rootNode);
    console.warn('[Bastiyan HIS] Root container was missing and has been recreated automatically.');
  }
  return rootNode;
}

const rootNode = ensureRootNode();
const root = rootNode._bastiyanRoot || createRoot(rootNode);
rootNode._bastiyanRoot = root;
root.render(_jsx(StrictMode, { children: _jsx(ErrorBoundary, { children: _jsx(App, {}) }) }));
