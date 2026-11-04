/** Store-level permission keys. Roles are stored per store and reference these keys. */
export const PERMISSIONS = [
  'dashboard.view',
  'customers.read', 'customers.write',
  'leads.read', 'leads.write',
  'products.read', 'products.write',
  'inventory.read', 'inventory.adjust',
  'suppliers.read', 'suppliers.write',
  'invoices.read', 'invoices.write', 'invoices.cancel',
  'payments.write',
  'services.read', 'services.write',
  'bookings.read', 'bookings.write',
  'repairs.read', 'repairs.write', 'repairs.status',
  'employees.read', 'employees.write',
  'reports.view',
  'settings.manage', 'domains.manage', 'website.publish',
  'staff.manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL = [...PERMISSIONS];

export const DEFAULT_STORE_ROLES: { name: string; permissions: Permission[] }[] = [
  { name: 'Owner', permissions: ALL },
  {
    name: 'Manager',
    permissions: ALL.filter((p) => !['staff.manage', 'domains.manage'].includes(p)),
  },
  {
    name: 'Cashier',
    permissions: ['dashboard.view', 'customers.read', 'customers.write', 'products.read', 'inventory.read', 'invoices.read', 'invoices.write', 'payments.write', 'services.read', 'bookings.read'],
  },
  {
    name: 'Technician',
    permissions: ['dashboard.view', 'customers.read', 'products.read', 'inventory.read', 'services.read', 'bookings.read', 'repairs.read', 'repairs.write', 'repairs.status'],
  },
  {
    name: 'Front Desk',
    permissions: ['dashboard.view', 'customers.read', 'customers.write', 'leads.read', 'leads.write', 'services.read', 'bookings.read', 'bookings.write', 'repairs.read', 'repairs.write', 'products.read'],
  },
];
