export type PersonRole = 'STUDENT' | 'TEACHER' | 'STAFF' | 'ADMIN' | 'VISITOR';
export type PersonStatus = 'ACTIVE' | 'INACTIVE';
export type BorrowStatus = 'BORROWED' | 'RETURNED' | 'CANCELLED';

export interface Person {
  id: number;
  name: string;
  role: PersonRole;
  status: PersonStatus;
}

export interface PersonInput {
  name: string;
  role: PersonRole;
  status: PersonStatus;
}

export interface Material {
  id: number;
  name: string;
  quantity: number;
}

export interface MaterialInput {
  name: string;
  quantity: number;
}

export interface Borrow {
  id: number;
  personId: number;
  materialId: number;
  quantity: number;
  borrowTime: string;
  dueTime: string;
  returnTime: string | null;
  status: BorrowStatus;
}

export interface BorrowInput {
  personId: number;
  materialId: number;
  quantity: number;
  dueTime: string;
}

export interface BorrowDetail {
  borrow: Borrow;
  person: {
    id: number;
    name: string | null;
    role: PersonRole | null;
    deleted: boolean;
  };
  material: {
    id: number;
    name: string | null;
    deleted: boolean;
  };
  overdueDays: number;
}

export interface Result<T> {
  code: number;
  message: string;
  data: T;
}
