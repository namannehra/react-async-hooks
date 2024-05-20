import { type DependencyList, useEffect, useMemo, useState } from 'react';

import { type UseAsyncResult, pending, setPendingResult } from './use-async';

export const useAsyncVoidCallback = <
    TArgs extends unknown[],
    TValue,
    TReason = unknown,
>(
    fn: (
        options: { pending: typeof pending; signal: AbortSignal },
        ...args: TArgs
    ) => PromiseLike<TValue | typeof pending>,
    deps: DependencyList,
): [(...args: TArgs) => PromiseLike<void>, UseAsyncResult<TValue, TReason>] => {
    const [result, setResult] = useState<UseAsyncResult<TValue, TReason>>({
        state: 'pending',
    });

    const [controller, callback] = useMemo(
        (): [AbortController, (...args: TArgs) => PromiseLike<void>] => {
            const controller = new AbortController();
            const { signal } = controller;
            return [
                controller,
                (...args) =>
                    fn({ pending, signal }, ...args).then(
                        value => {
                            if (!signal.aborted && value !== pending) {
                                setResult({ state: 'fulfilled', value });
                            }
                        },
                        reason => {
                            if (!signal.aborted) {
                                setResult({ state: 'rejected', reason });
                            }
                        },
                    ),
            ];
        },
        deps,
    );

    useEffect(() => {
        setResult(setPendingResult);
    }, deps);

    useEffect(() => {
        return () => {
            controller.abort();
        };
    }, [controller]);

    return useMemo(() => [callback, result], [callback, result]);
};
