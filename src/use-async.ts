import { type DependencyList, useEffect, useState } from 'react';

export type UseAsyncState = 'pending' | 'rejected' | 'fulfilled';

export interface UseAsyncPendingResult {
    state: 'pending';
    reason?: never;
    value?: never;
}

export interface UseAsyncRejectedResult<TReason = unknown> {
    state: 'rejected';
    reason: TReason;
    value?: never;
}

export interface UseAsyncFulfilledResult<TValue> {
    state: 'fulfilled';
    reason?: never;
    value: TValue;
}

export type UseAsyncResult<TValue, TReason = unknown> =
    | UseAsyncPendingResult
    | UseAsyncRejectedResult<TReason>
    | UseAsyncFulfilledResult<TValue>;

export const pending = Symbol('pending');

export const setPendingResult = (
    result: UseAsyncResult<unknown>,
): UseAsyncPendingResult => {
    if (result.state === 'pending') {
        return result;
    }
    return { state: 'pending' };
};

export const useAsync = <TValue, TReason = unknown>(
    fn: (options: {
        pending: typeof pending;
        signal: AbortSignal;
    }) => PromiseLike<TValue | typeof pending>,
    deps: DependencyList,
): UseAsyncResult<TValue, TReason> => {
    const [result, setResult] = useState<UseAsyncResult<TValue, TReason>>({
        state: 'pending',
    });

    useEffect(() => {
        setResult(setPendingResult);
        const controller = new AbortController();
        const { signal } = controller;
        fn({ pending, signal }).then(
            value => {
                if (!signal.aborted && value !== pending) {
                    setResult({
                        state: 'fulfilled',
                        value,
                    });
                }
            },
            reason => {
                if (!signal.aborted) {
                    setResult({
                        state: 'rejected',
                        reason,
                    });
                }
            },
        );
        return () => {
            controller.abort();
        };
    }, deps);

    return result;
};
