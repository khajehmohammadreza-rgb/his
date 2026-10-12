/* Bastiyan HIS Recharts Bridge */
const RC = globalThis.__BASTIYAN_VENDOR__?.Recharts || globalThis.Recharts || {};

const stub = (name) => {
  return (props) => {
    const C = (globalThis.__BASTIYAN_VENDOR__?.Recharts || {})[name];
    if (typeof C === 'function') return C(props);
    return props?.children || null;
  };
};

export const ResponsiveContainer = RC.ResponsiveContainer || stub('ResponsiveContainer');
export const BarChart = RC.BarChart || stub('BarChart');
export const Bar = RC.Bar || stub('Bar');
export const LineChart = RC.LineChart || stub('LineChart');
export const Line = RC.Line || stub('Line');
export const AreaChart = RC.AreaChart || stub('AreaChart');
export const Area = RC.Area || stub('Area');
export const PieChart = RC.PieChart || stub('PieChart');
export const Pie = RC.Pie || stub('Pie');
export const Cell = RC.Cell || stub('Cell');
export const XAxis = RC.XAxis || stub('XAxis');
export const YAxis = RC.YAxis || stub('YAxis');
export const Tooltip = RC.Tooltip || stub('Tooltip');
export const Legend = RC.Legend || stub('Legend');
export const CartesianGrid = RC.CartesianGrid || stub('CartesianGrid');

export default RC;

