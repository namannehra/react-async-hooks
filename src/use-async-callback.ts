import { type DependencyList, useEffect, useMemo, useState } from 'react';

import { type UseAsyncResult, setPendingResult } from './use-async';

export const useAsyncCallback = <
    TArgs extends unknown[],
    TValue,
    TReason = unknown,
>(
    fn: (
        options: { signal: AbortSignal },
        ...args: TArgs
    ) => PromiseLike<TValue>,
    deps: DependencyList,
): [
    (...args: TArgs) => PromiseLike<TValue>,
    UseAsyncResult<TValue, TReason>,
] => {
    const [result, setResult] = useState<UseAsyncResult<TValue, TReason>>({
        state: 'pending',
    });

    const [controller, callback] = useMemo(
        (): [AbortController, (...args: TArgs) => PromiseLike<TValue>] => {
            const controller = new AbortController();
            const { signal } = controller;
            return [
                controller,
                (...args) =>
                    fn({ signal }, ...args).then(
                        value => {
                            if (!signal.aborted) {
                                setResult({ state: 'fulfilled', value });
                            }
                            return value;
                        },
                        reason => {
                            if (!signal.aborted) {
                                setResult({ state: 'rejected', reason });
                            }
                            throw reason;
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
