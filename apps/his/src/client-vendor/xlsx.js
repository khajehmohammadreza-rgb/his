/* Bastiyan HIS XLSX Bridge */
const X = globalThis.__BASTIYAN_VENDOR__?.XLSX || globalThis.XLSX || {};

export const utils = X.utils || {
  book_new: () => ({ SheetNames: [], Sheets: {} }),
  aoa_to_sheet: () => ({}),
  json_to_sheet: () => ({}),
  sheet_to_json: () => [],
  book_append_sheet: () => {},
};

export const writeFile = X.writeFile || (() => {});
export const write = X.write || (() => {});
export const read = X.read || (() => ({ SheetNames: [], Sheets: {} }));

export default X;

