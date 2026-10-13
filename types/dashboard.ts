export type KPI = {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: string;
  trendType?: 'up' | 'down';
};

export type DashboardPeriodFilter = 'today' | 'month';

export type DashboardPeriod = {
  from: string;
  to: string;
};

export type Activity = {
  id: string;
  patient: string;
  tests: string;
  status: 'Pending' | 'Completed';
  paymentStatus: 'Paid' | 'Unpaid';
  time: string;
};

export type Alert = {
  id: string;
  type: 'danger' | 'warning';
  message: string;
  icon: React.ReactNode;
};
