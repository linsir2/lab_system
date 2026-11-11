import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createBorrow } from '../api/borrows';
import BorrowFormModal from './BorrowFormModal';

vi.mock('../api/borrows', () => ({ createBorrow: vi.fn() }));

const persons = [{ id: 1, name: '张三', role: 'STUDENT' as const, status: 'ACTIVE' as const }];
const materials = [{ id: 3, name: '示波器', quantity: 2 }];

describe('BorrowFormModal', () => {
  beforeEach(() => {
    vi.mocked(createBorrow).mockReset();
    vi.mocked(createBorrow).mockResolvedValue({
      id: 9,
      personId: 1,
      materialId: 3,
      quantity: 2,
      borrowTime: '2026-11-04T02:00:00Z',
      dueTime: '2099-01-01T10:00:00Z',
      returnTime: null,
      status: 'BORROWED',
    });
  });

  it('rejects a quantity above the current stock', async () => {
    const user = userEvent.setup();
    render(
      <BorrowFormModal open persons={persons} materials={materials} onClose={vi.fn()} onSaved={vi.fn()} />,
    );

    await user.clear(screen.getByLabelText('借用数量'));
    await user.type(screen.getByLabelText('借用数量'), '3');
    await user.type(screen.getByLabelText('应还时间'), '2099-01-01T10:00');
    await user.click(screen.getByRole('button', { name: '创建借用' }));

    expect(await screen.findByText(/数量必须是/)).toBeInTheDocument();
    expect(createBorrow).not.toHaveBeenCalled();
  });

  it('rejects a due time in the past', async () => {
    const user = userEvent.setup();
    render(
      <BorrowFormModal open persons={persons} materials={materials} onClose={vi.fn()} onSaved={vi.fn()} />,
    );

    await user.type(screen.getByLabelText('应还时间'), '2000-01-01T10:00');
    await user.click(screen.getByRole('button', { name: '创建借用' }));

    expect(await screen.findByText(/应还时间必须晚于当前时间/)).toBeInTheDocument();
    expect(createBorrow).not.toHaveBeenCalled();
  });

  it('submits a valid borrow with an ISO due time', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(
      <BorrowFormModal open persons={persons} materials={materials} onClose={vi.fn()} onSaved={onSaved} />,
    );

    await user.clear(screen.getByLabelText('借用数量'));
    await user.type(screen.getByLabelText('借用数量'), '2');
    await user.type(screen.getByLabelText('应还时间'), '2099-01-01T10:00');
    await user.click(screen.getByRole('button', { name: '创建借用' }));

    expect(createBorrow).toHaveBeenCalledWith({
      personId: 1,
      materialId: 3,
      quantity: 2,
      dueTime: new Date('2099-01-01T10:00').toISOString(),
    });
    expect(onSaved).toHaveBeenCalled();
  });
});
