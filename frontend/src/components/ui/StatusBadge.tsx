import type { ReactNode } from 'react';

export type BadgeTone = 'amber' | 'red' | 'green' | 'gray';

export default function StatusBadge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return <span className={`status-badge ${tone}`}>{children}</span>;
}
