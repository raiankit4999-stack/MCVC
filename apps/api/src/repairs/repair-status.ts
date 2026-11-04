import { RepairStatus } from '@prisma/client';

export const REPAIR_TRANSITIONS: Record<RepairStatus, RepairStatus[]> = {
  RECEIVED: ['DIAGNOSING', 'CANCELLED'],
  DIAGNOSING: ['WAITING_FOR_APPROVAL', 'WAITING_FOR_PARTS', 'IN_PROGRESS', 'CANCELLED'],
  WAITING_FOR_APPROVAL: ['IN_PROGRESS', 'WAITING_FOR_PARTS', 'READY', 'CANCELLED'],
  WAITING_FOR_PARTS: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['QUALITY_CHECK', 'WAITING_FOR_PARTS'],
  QUALITY_CHECK: ['READY', 'IN_PROGRESS'],
  READY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const REPAIR_STATUS_LABEL: Record<RepairStatus, string> = {
  RECEIVED: 'Received',
  DIAGNOSING: 'Diagnosing',
  WAITING_FOR_APPROVAL: 'Waiting for approval',
  WAITING_FOR_PARTS: 'Waiting for parts',
  IN_PROGRESS: 'In progress',
  QUALITY_CHECK: 'Quality check',
  READY: 'Ready for collection',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export function canTransition(from: RepairStatus, to: RepairStatus) {
  return REPAIR_TRANSITIONS[from].includes(to);
}
