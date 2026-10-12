/* Bastiyan HIS QRCode React Bridge */
const Q = globalThis.__BASTIYAN_VENDOR__?.QRCodeSVG || globalThis.__BASTIYAN_VENDOR__?.QRCodeCanvas || ((props) => null);
export const QRCodeSVG = Q;
export const QRCodeCanvas = Q;
export default Q;

