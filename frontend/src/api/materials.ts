import type { Material, MaterialInput } from '../types';
import { request } from './client';

export function listMaterials(): Promise<Material[]> {
  return request<Material[]>('/api/materials');
}

export function createMaterial(body: MaterialInput): Promise<Material> {
  return request<Material>('/api/materials', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateMaterial(id: number, body: MaterialInput): Promise<Material> {
  return request<Material>(`/api/materials/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteMaterial(id: number): Promise<void> {
  return request<void>(`/api/materials/${id}`, { method: 'DELETE' });
}
