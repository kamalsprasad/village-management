/**
 * Placeholder Data for Dashboard Widgets
 *
 * Provides realistic sample data for MVP dashboard visualization.
 * This data will be replaced with real API calls in future stories.
 */

import { addDays, subDays, format } from 'date-fns';

/**
 * Upcoming Events Widget Data
 * Simulates community events, meetings, and important dates
 */
export const upcomingEvents = [
  {
    id: 1,
    title: 'Village Council Meeting',
    date: addDays(new Date(), 2),
    time: '14:00',
    location: 'Community Hall',
    type: 'meeting',
    attendees: 12,
  },
  {
    id: 2,
    title: 'School Parent-Teacher Conference',
    date: addDays(new Date(), 5),
    time: '09:00',
    location: 'Katete Model School',
    type: 'education',
    attendees: 45,
  },
  {
    id: 3,
    title: 'Farm Harvest Festival',
    date: addDays(new Date(), 8),
    time: '10:00',
    location: 'Main Farm Plot',
    type: 'celebration',
    attendees: 120,
  },
  {
    id: 4,
    title: 'Financial Literacy Workshop',
    date: addDays(new Date(), 12),
    time: '15:00',
    location: 'Community Center',
    type: 'training',
    attendees: 30,
  },
  {
    id: 5,
    title: 'Health & Wellness Clinic',
    date: addDays(new Date(), 15),
    time: '08:00',
    location: 'Village Clinic',
    type: 'health',
    attendees: 60,
  },
];

/**
 * Quick Stats Widget Data
 * Simulates key metrics across all modules
 */
export const quickStats = {
  households: {
    total: 87,
    active: 82,
    change: '+3',
    changePercent: 3.7,
    trend: 'up',
  },
  residents: {
    total: 342,
    adults: 198,
    children: 144,
    change: '+12',
    changePercent: 3.6,
    trend: 'up',
  },
  finance: {
    monthlyIncome: 45250.0,
    monthlyExpenses: 38100.0,
    balance: 7150.0,
    change: '+1250',
    changePercent: 21.2,
    trend: 'up',
    currency: 'ZMW',
  },
  lending: {
    activeLoans: 23,
    totalLent: 125000.0,
    repaymentRate: 94.5,
    change: '+2',
    changePercent: 9.5,
    trend: 'up',
    currency: 'ZMW',
  },
  farm: {
    activePlots: 15,
    currentCrops: 8,
    harvestThisMonth: 2,
    yieldTrend: 12.3,
    trend: 'up',
  },
  school: {
    totalStudents: 156,
    attendance: 94.2,
    activeClasses: 6,
    teachers: 8,
    trend: 'stable',
  },
  inventory: {
    totalItems: 342,
    lowStock: 12,
    value: 67500.0,
    change: '-5',
    changePercent: -1.4,
    trend: 'down',
    currency: 'ZMW',
  },
};

/**
 * Recent Activity Widget Data
 * Simulates activity log entries from various modules
 */
export const recentActivity = [
  {
    id: 1,
    type: 'household',
    icon: 'home',
    color: 'primary',
    title: 'New household registered',
    description: 'Mwanza Family added to the system',
    user: 'Sarah Banda',
    timestamp: subDays(new Date(), 0.5),
    module: 'Households',
  },
  {
    id: 2,
    type: 'finance',
    icon: 'payments',
    color: 'positive',
    title: 'Income recorded',
    description: 'Maize sale: ZMW 12,500',
    user: 'John Phiri',
    timestamp: subDays(new Date(), 1),
    module: 'Finance',
  },
  {
    id: 3,
    type: 'farm',
    icon: 'agriculture',
    color: 'green',
    title: 'Harvest completed',
    description: 'Plot 7: Tomatoes - 450kg yield',
    user: 'Mary Tembo',
    timestamp: subDays(new Date(), 1.5),
    module: 'Farm',
  },
  {
    id: 4,
    type: 'lending',
    icon: 'account_balance',
    color: 'orange',
    title: 'Loan repayment received',
    description: 'Grace Mulenga - ZMW 2,000',
    user: 'System',
    timestamp: subDays(new Date(), 2),
    module: 'Lending',
  },
  {
    id: 5,
    type: 'school',
    icon: 'school',
    color: 'purple',
    title: 'Attendance recorded',
    description: 'Grade 5: 28/30 students present',
    user: 'Teacher Chanda',
    timestamp: subDays(new Date(), 2.5),
    module: 'School',
  },
  {
    id: 6,
    type: 'resident',
    icon: 'person_add',
    color: 'blue',
    title: 'New resident added',
    description: 'Baby Chola born to Mwanza Family',
    user: 'Sarah Banda',
    timestamp: subDays(new Date(), 3),
    module: 'Residents',
  },
  {
    id: 7,
    type: 'inventory',
    icon: 'inventory_2',
    color: 'brown',
    title: 'Stock alert',
    description: 'Fertilizer running low (15kg remaining)',
    user: 'System',
    timestamp: subDays(new Date(), 3.5),
    module: 'Inventory',
  },
  {
    id: 8,
    type: 'finance',
    icon: 'receipt',
    color: 'negative',
    title: 'Expense recorded',
    description: 'School supplies purchase: ZMW 3,200',
    user: 'John Phiri',
    timestamp: subDays(new Date(), 4),
    module: 'Finance',
  },
  {
    id: 9,
    type: 'communication',
    icon: 'campaign',
    color: 'info',
    title: 'Announcement sent',
    description: 'Village meeting reminder to 87 households',
    user: 'Admin',
    timestamp: subDays(new Date(), 4.5),
    module: 'Communications',
  },
  {
    id: 10,
    type: 'calendar',
    icon: 'event',
    color: 'teal',
    title: 'Event scheduled',
    description: 'Farm Harvest Festival on ' + format(addDays(new Date(), 8), 'MMM dd'),
    user: 'Mary Tembo',
    timestamp: subDays(new Date(), 5),
    module: 'Calendar',
  },
];

/**
 * Helper function to format activity timestamps
 * @param {Date} timestamp - Activity timestamp
 * @returns {string} - Formatted relative time
 */
export function formatActivityTime(timestamp) {
  const now = new Date();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return format(timestamp, 'MMM dd, yyyy');
}

/**
 * Helper function to get event type icon
 * @param {string} type - Event type
 * @returns {string} - Quasar icon name
 */
export function getEventIcon(type) {
  const icons = {
    meeting: 'groups',
    education: 'school',
    celebration: 'celebration',
    training: 'model_training',
    health: 'medical_services',
    default: 'event',
  };
  return icons[type] || icons.default;
}

/**
 * Helper function to get event type color
 * @param {string} type - Event type
 * @returns {string} - Quasar color name
 */
export function getEventColor(type) {
  const colors = {
    meeting: 'primary',
    education: 'purple',
    celebration: 'positive',
    training: 'orange',
    health: 'red',
    default: 'grey',
  };
  return colors[type] || colors.default;
}
