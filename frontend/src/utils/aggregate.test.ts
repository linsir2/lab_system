import { describe, expect, it } from 'vitest';

import type { Borrow, Material, Person } from '../types';
import { buildOverview, isOverdue } from './aggregate';

const persons: Person[] = [
  { id: 1, name: '张三', role: 'STUDENT', status: 'ACTIVE' },
  { id: 2, name: '李四', role: 'TEACHER', status: 'INACTIVE' },
];

const materials: Material[] = [
  { id: 1, name: '示波器', quantity: 8 },
  { id: 2, name: '万用表', quantity: 14 },
  { id: 3, name: '信号发生器', quantity: 3 },
  { id: 4, name: '电源', quantity: 1 },
];

function borrow(overrides: Partial<Borrow>): Borrow {
  return {
    id: 1,
    personId: 1,
    materialId: 1,
    quantity: 2,
    borrowTime: '2026-11-04T02:00:00Z',
    dueTime: '2099-01-01T00:00:00Z',
    returnTime: null,
    status: 'BORROWED',
    ...overrides,
  };
}

describe('buildOverview', () => {
  const now = new Date('2026-11-04T12:00:00Z');
  const borrows: Borrow[] = [
    borrow({ id: 1, materialId: 1, quantity: 2, status: 'BORROWED' }),
    borrow({ id: 2, materialId: 2, quantity: 6, status: 'BORROWED' }),
    borrow({ id: 3, status: 'RETURNED', returnTime: '2026-11-04T08:00:00Z' }),
    borrow({ id: 4, status: 'CANCELLED', returnTime: null }),
    borrow({ id: 5, status: 'RETURNED', returnTime: '2026-11-03T08:00:00Z' }),
    borrow({ id: 6, status: 'BORROWED', dueTime: '2026-11-01T00:00:00Z' }),
  ];

  it('computes metric cards', () => {
    const overview = buildOverview(persons, materials, borrows, now);

    expect(overview.metrics.personCount).toBe(2);
    expect(overview.metrics.activePersonCount).toBe(1);
    expect(overview.metrics.materialKinds).toBe(4);
    expect(overview.metrics.stockTotal).toBe(26);
    expect(overview.metrics.activeBorrows).toBe(3);
    expect(overview.metrics.returnedToday).toBe(1);
  });

  it('derives stock total as current quantity plus active borrowed quantity', () => {
    const overview = buildOverview(persons, materials, borrows, now);
    const scope = overview.stockRows.find((row) => row.id === 1);
    const meter = overview.stockRows.find((row) => row.id === 2);

    expect(scope).toMatchObject({ quantity: 8, total: 12 });
    expect(meter).toMatchObject({ quantity: 14, total: 20 });
  });

  it('returns the five most recent borrows with names and overdue flag', () => {
    const overview = buildOverview(persons, materials, borrows, now);

    expect(overview.recent).toHaveLength(5);
    expect(overview.recent[0].borrow.id).toBe(6);
    expect(overview.recent[0].overdue).toBe(true);
    expect(overview.recent[0].personName).toBe('张三');
    expect(overview.recent[0].materialName).toBe('示波器');
  });

  it('marks only active borrows past due as overdue', () => {
    expect(isOverdue(borrow({ dueTime: '2026-11-01T00:00:00Z' }), now)).toBe(true);
    expect(isOverdue(borrow({ status: 'RETURNED', dueTime: '2026-11-01T00:00:00Z' }), now)).toBe(false);
    expect(isOverdue(borrow({ dueTime: '2099-01-01T00:00:00Z' }), now)).toBe(false);
  });
});
