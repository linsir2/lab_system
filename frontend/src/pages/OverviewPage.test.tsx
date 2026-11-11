import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listBorrows } from '../api/borrows';
import { listMaterials } from '../api/materials';
import { listPersons } from '../api/persons';
import OverviewPage from './OverviewPage';

vi.mock('../api/persons', () => ({ listPersons: vi.fn() }));
vi.mock('../api/materials', () => ({ listMaterials: vi.fn() }));
vi.mock('../api/borrows', () => ({ listBorrows: vi.fn() }));

describe('OverviewPage', () => {
  beforeEach(() => {
    vi.mocked(listPersons).mockResolvedValue([
      { id: 1, name: '张三', role: 'STUDENT', status: 'ACTIVE' },
      { id: 2, name: '李四', role: 'TEACHER', status: 'INACTIVE' },
    ]);
    vi.mocked(listMaterials).mockResolvedValue([{ id: 1, name: '示波器', quantity: 8 }]);
    vi.mocked(listBorrows).mockResolvedValue([
      {
        id: 1,
        personId: 1,
        materialId: 1,
        quantity: 2,
        borrowTime: '2026-11-04T02:00:00Z',
        dueTime: '2099-01-01T00:00:00Z',
        returnTime: null,
        status: 'BORROWED',
      },
    ]);
  });

  it('renders metric cards, recent borrows and stock totals', async () => {
    render(
      <MemoryRouter>
        <OverviewPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('在册人员')).toBeInTheDocument();
    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getAllByText('示波器').length).toBeGreaterThan(0);
    expect(screen.getAllByText('借用中').length).toBeGreaterThan(0);
    expect(screen.getByText('/ 10')).toBeInTheDocument();
  });
});
