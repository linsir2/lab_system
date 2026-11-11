import type { Borrow, BorrowDetail, BorrowInput, BorrowStatus } from '../types';
import { request } from './client';

export interface BorrowFilters {
  personId?: number;
  materialId?: number;
  status?: BorrowStatus;
}

export function listBorrows(filters: BorrowFilters = {}): Promise<Borrow[]> {
  const params = new URLSearchParams();
  if (filters.personId) {
    params.set('personId', String(filters.personId));
  }
  if (filters.materialId) {
    params.set('materialId', String(filters.materialId));
  }
  if (filters.status) {
    params.set('status', filters.status);
  }
  const query = params.toString();
  return request<Borrow[]>(`/api/borrows${query ? `?${query}` : ''}`);
}

export function getBorrow(id: number): Promise<Borrow> {
  return request<Borrow>(`/api/borrows/${id}`);
}

export function getBorrowDetail(id: number): Promise<BorrowDetail> {
  return request<BorrowDetail>(`/api/borrows/${id}/detail`);
}

export function createBorrow(body: BorrowInput): Promise<Borrow> {
  return request<Borrow>('/api/borrows', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function returnBorrow(id: number): Promise<Borrow> {
  return request<Borrow>(`/api/borrows/${id}/return`, { method: 'PUT' });
}

export function cancelBorrow(id: number): Promise<Borrow> {
  return request<Borrow>(`/api/borrows/${id}`, { method: 'DELETE' });
}
