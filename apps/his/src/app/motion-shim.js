import React from '../client-vendor/react.js?b=r24-514-1405';

const OMIT = new Set([
  'initial','animate','exit','transition','variants','whileHover','whileTap',
  'whileFocus','whileInView','viewport','layout','layoutId','custom','drag',
  'dragConstraints','dragElastic','dragMomentum','onAnimationStart','onAnimationComplete'
]);

function cleanProps(input = {}) {
  const out = {};
  for (const [key, value] of Object.entries(input)) {
    if (!OMIT.has(key)) out[key] = value;
  }
  return out;
}

const cache = new Map();
export const motion = new Proxy({}, {
  get(_target, tag) {
    if (cache.has(tag)) return cache.get(tag);
    const Component = React.forwardRef((props, ref) =>
      React.createElement(tag, { ...cleanProps(props), ref }, props?.children)
    );
    Component.displayName = `BastiyanMotion(${String(tag)})`;
    cache.set(tag, Component);
    return Component;
  }
});

export function AnimatePresence({ children }) {
  return React.createElement(React.Fragment, null, children);
}
