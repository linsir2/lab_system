import { describe, expect, it } from 'vitest';

import { formatDate, formatDateTime, toIsoFromLocal } from './date';

describe('date utils', () => {
  it('formats an ISO timestamp as a local date', () => {
    expect(formatDate('2026-11-11T02:00:00Z')).toMatch(/^2026-11-11$/);
  });

  it('formats a date-time with hours and minutes', () => {
    expect(formatDateTime('2026-11-11T02:00:00Z')).toMatch(/^2026-11-11 \d{2}:\d{2}$/);
  });

  it('returns a placeholder for null', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDateTime(null)).toBe('—');
  });

  it('converts a datetime-local value to UTC ISO', () => {
    const iso = toIsoFromLocal('2026-11-11T10:00');
    expect(iso).toBe(new Date('2026-11-11T10:00').toISOString());
    expect(iso.endsWith('Z')).toBe(true);
  });
});
