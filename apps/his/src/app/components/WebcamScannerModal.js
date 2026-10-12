/** Compatibility adapter: all inventory/purchase/POS/reception readers share R24 engine. */
import React from '../../client-vendor/react.js?b=r24-514-1405';
import { BarcodeCameraScanner } from './BarcodeCameraScanner434.js?b=r24-514-1405';
export const WebcamScannerModal=({products=[],onScanBarcode,onClose,continuous=false})=>
  React.createElement(BarcodeCameraScanner,{open:true,onDetected:(code,control)=>onScanBarcode?.(code,control),onClose,continuous});
