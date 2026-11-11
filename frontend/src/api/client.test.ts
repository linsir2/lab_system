import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, request } from './client';

function mockResponse(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('request', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('unwraps the Result data envelope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(200, { code: 200, message: 'success', data: { id: 1 } })));

    await expect(request<{ id: number }>('/api/persons/1')).resolves.toEqual({ id: 1 });
  });

  it('throws ApiError with the server message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(409, { code: 409, message: 'insufficient stock' })));

    await expect(request('/api/borrows')).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      message: 'insufficient stock',
    });
    await expect(request('/api/borrows')).rejects.toBeInstanceOf(ApiError);
  });

  it('returns undefined for 204', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(204)));

    await expect(request('/api/borrows/1')).resolves.toBeUndefined();
  });

  it('uses a generic message when the error body is empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(502)));

    await expect(request('/api/borrows')).rejects.toMatchObject({
      status: 502,
      message: '请求失败（502）',
    });
  });
});
