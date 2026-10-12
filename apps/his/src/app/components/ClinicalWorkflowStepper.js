import React from '../../client-vendor/react.js?b=r24-514-1405';
import { UserPlus, Stethoscope, HeartPulse, CreditCard, CheckCircle2 } from '../../client-vendor/lucide-react.js?b=r24-514-1405';

const h = React.createElement;

const steps = [
  { key: 'reception', label: 'پذیرش', icon: UserPlus },
  { key: 'care', label: 'پزشک / درمان', icon: Stethoscope },
  { key: 'nursing', label: 'پرستار / دستیار', icon: HeartPulse },
  { key: 'cashier', label: 'صندوق', icon: CreditCard },
  { key: 'discharge', label: 'ترخیص', icon: CheckCircle2 },
];

const statusIndex = (status, predictedStatus) => {
  const s = status || predictedStatus || 'reception';
  if (['completed', 'discharged'].includes(s)) return 4;
  if (['ready_for_discharge', 'cashier', 'waiting_cashier'].includes(s)) return 3;
  if (['waiting_nurse', 'nursing', 'nursing_in_progress', 'operating_room'].includes(s)) return 2;
  if (['waiting_doctor', 'doctor', 'waiting_reception_referral', 'reception_review'].includes(s)) return 1;
  return 0;
};

export function ClinicalWorkflowStepper({ status = 'reception', predictedStatus = '', compact = false }) {
  const activeIndex = statusIndex(status, predictedStatus);
  return h('div', { className: `clinical-flow-stepper ${compact ? 'compact' : ''}`, role: 'navigation', 'aria-label': 'مراحل مراجعه بیمار' },
    ...steps.map((step, index) => {
      const Icon = step.icon;
      const state = index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'upcoming';
      return h('div', { key: step.key, className: `clinical-flow-step ${state}` },
        h('div', { className: 'clinical-flow-node' }, h(Icon, { className: 'w-4 h-4' })),
        h('span', null, step.label),
        index < steps.length - 1 ? h('i', { className: 'clinical-flow-line', 'aria-hidden': 'true' }) : null
      );
    })
  );
}
