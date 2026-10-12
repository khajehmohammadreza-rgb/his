/* Bastiyan HIS JSX Runtime Bridge */
const J = globalThis.__BASTIYAN_VENDOR__?.jsxRuntime || {};

export const jsx = J.jsx || ((type, props, key) => {
  const React = globalThis.__BASTIYAN_VENDOR__?.React || globalThis.React;
  if (!React) return null;
  const { children, ...rest } = props || {};
  return React.createElement(type, key !== undefined ? { ...rest, key } : rest, children);
});

export const jsxs = J.jsxs || jsx;
export const Fragment = J.Fragment || (globalThis.__BASTIYAN_VENDOR__?.React?.Fragment) || Symbol.for('react.fragment');

export default { jsx, jsxs, Fragment };

