import type { Person, PersonInput, PersonRole, PersonStatus } from '../types';
import { request } from './client';

export interface PersonFilters {
  role?: PersonRole;
  status?: PersonStatus;
}

export function listPersons(filters: PersonFilters = {}): Promise<Person[]> {
  const params = new URLSearchParams();
  if (filters.role) {
    params.set('role', filters.role);
  }
  if (filters.status) {
    params.set('status', filters.status);
  }
  const query = params.toString();
  return request<Person[]>(`/api/persons${query ? `?${query}` : ''}`);
}

export function createPerson(body: PersonInput): Promise<Person> {
  return request<Person>('/api/persons', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updatePerson(id: number, body: PersonInput): Promise<Person> {
  return request<Person>(`/api/persons/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deletePerson(id: number): Promise<void> {
  return request<void>(`/api/persons/${id}`, { method: 'DELETE' });
}
