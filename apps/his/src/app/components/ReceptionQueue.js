/**
 * ReceptionQueue Proxy Bridge
 * Maps legacy monolithic ReceptionQueue imports directly to the modern UnifiedEncounterWorkflow457-final
 * to maintain 100% backward compatibility and eliminate 144KB of redundant legacy code.
 */
import React from '../../client-vendor/react.js?b=r24-514-1405';
import { UnifiedEncounterWorkflow } from './UnifiedEncounterWorkflow457-final.js?b=r24-514-1405';

const h = React.createElement;

export const ReceptionQueue = (props) => {
    return h(UnifiedEncounterWorkflow, { ...props, initialStage: props.initialStage || 'reception' });
};

export default ReceptionQueue;
