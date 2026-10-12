/* Bastiyan HIS React Vendor Bridge */
const R = globalThis.__BASTIYAN_VENDOR__?.React || globalThis.React || {};

export const {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useContext,
  createContext,
  useReducer,
  useId,
  useDeferredValue,
  useTransition,
  useLayoutEffect,
  useImperativeHandle,
  Fragment,
  StrictMode,
  Children,
  cloneElement,
  createElement,
  isValidElement,
  forwardRef,
  memo,
  lazy,
  Suspense,
  version,
} = R;

export default R;

