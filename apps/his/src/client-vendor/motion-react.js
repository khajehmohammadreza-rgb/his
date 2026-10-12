import * as React from './react.js?b=r24-514-1405';

const OMIT = new Set([
  'initial','animate','exit','transition','variants','whileHover','whileTap',
  'whileFocus','whileInView','viewport','layout','layoutId','custom',
  'drag','dragConstraints','dragElastic','dragMomentum','onAnimationStart',
  'onAnimationComplete'
]);

function cleanProps(input){
  const out={};
  for(const [k,v] of Object.entries(input||{})){
    if(OMIT.has(k)) continue;
    out[k]=v;
  }
  return out;
}

const componentCache=new Map();
export const motion=new Proxy({},{
  get(_target,tag){
    if(componentCache.has(tag)) return componentCache.get(tag);
    const C=React.forwardRef((props,ref)=>{
      const p=cleanProps(props);
      return React.createElement(tag,{...p,ref},props?.children);
    });
    C.displayName='BastiyanMotion('+String(tag)+')';
    componentCache.set(tag,C);
    return C;
  }
});

export function AnimatePresence({children}){
  return React.createElement(React.Fragment,null,children);
}