import { useCallback, useState } from 'react';

export interface MutationState<TArgs extends unknown[], TResult> {
  run: (...args: TArgs) => Promise<TResult | undefined>;
  submitting: boolean;
  error: string | null;
  reset: () => void;
}

export function useMutation<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
): MutationState<TArgs, TResult> {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (...args: TArgs) => {
      setSubmitting(true);
      setError(null);
      try {
        return await action(...args);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : '操作失败');
        return undefined;
      } finally {
        setSubmitting(false);
      }
    },
    [action],
  );

  const reset = useCallback(() => setError(null), []);

  return { run, submitting, error, reset };
}
