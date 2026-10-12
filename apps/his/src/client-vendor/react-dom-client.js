/* Bastiyan HIS React DOM Client Bridge */
const RC = globalThis.__BASTIYAN_VENDOR__?.ReactDOMClient || globalThis.__BASTIYAN_VENDOR__?.ReactDOM || globalThis.ReactDOM || {};

export const createRoot = RC.createRoot || ((container) => {
  return {
    render: (element) => {
      if (globalThis.__BASTIYAN_VENDOR__?.ReactDOM?.render) {
        globalThis.__BASTIYAN_VENDOR__.ReactDOM.render(element, container);
      }
    },
    unmount: () => {}
  };
});

export const hydrateRoot = RC.hydrateRoot || createRoot;
export default RC;

