import type { Borrow, Material, Person } from '../types';
import { isToday } from './date';

export interface OverviewMetrics {
  personCount: number;
  activePersonCount: number;
  materialKinds: number;
  stockTotal: number;
  activeBorrows: number;
  returnedToday: number;
}

export interface RecentBorrowRow {
  borrow: Borrow;
  personName: string;
  materialName: string;
  overdue: boolean;
}

export interface StockRow {
  id: number;
  name: string;
  quantity: number;
  total: number;
}

export interface OverviewData {
  metrics: OverviewMetrics;
  recent: RecentBorrowRow[];
  stockRows: StockRow[];
}

export function isOverdue(borrow: Borrow, now: Date = new Date()): boolean {
  return borrow.status === 'BORROWED' && new Date(borrow.dueTime).getTime() < now.getTime();
}

export function buildOverview(
  persons: Person[],
  materials: Material[],
  borrows: Borrow[],
  now: Date = new Date(),
): OverviewData {
  const personById = new Map(persons.map((person) => [person.id, person]));
  const materialById = new Map(materials.map((material) => [material.id, material]));
  const activeBorrows = borrows.filter((borrow) => borrow.status === 'BORROWED');

  const activeQuantityByMaterial = new Map<number, number>();
  for (const borrow of activeBorrows) {
    activeQuantityByMaterial.set(
      borrow.materialId,
      (activeQuantityByMaterial.get(borrow.materialId) ?? 0) + borrow.quantity,
    );
  }

  const stockRows: StockRow[] = [...materials]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 3)
    .map((material) => ({
      id: material.id,
      name: material.name,
      quantity: material.quantity,
      total: material.quantity + (activeQuantityByMaterial.get(material.id) ?? 0),
    }));

  const recent: RecentBorrowRow[] = [...borrows]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5)
    .map((borrow) => ({
      borrow,
      personName: personById.get(borrow.personId)?.name ?? '已删除人员',
      materialName: materialById.get(borrow.materialId)?.name ?? '已删除物资',
      overdue: isOverdue(borrow, now),
    }));

  return {
    metrics: {
      personCount: persons.length,
      activePersonCount: persons.filter((person) => person.status === 'ACTIVE').length,
      materialKinds: materials.length,
      stockTotal: materials.reduce((sum, material) => sum + material.quantity, 0),
      activeBorrows: activeBorrows.length,
      returnedToday: borrows.filter(
        (borrow) => borrow.status === 'RETURNED' && isToday(borrow.returnTime, now),
      ).length,
    },
    recent,
    stockRows,
  };
}
