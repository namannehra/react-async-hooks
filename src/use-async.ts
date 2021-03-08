import { DependencyList, useEffect, useState } from 'react';

export enum UseAsyncState {
    unknown = 'unknown',
    error = 'error',
    done = 'done',
}

export interface UseAsyncUnknownResult {
    state: UseAsyncState.unknown;
    error?: undefined;
    value?: undefined;
}

export interface UseAsyncErrorResult {
    state: UseAsyncState.error;
    error: unknown;
    value?: undefined;
}

export interface UseAsyncDoneResult<T> {
    state: UseAsyncState.done;
    error?: undefined;
    value: T;
}

export type UseAsyncResult<T> = UseAsyncUnknownResult | UseAsyncErrorResult | UseAsyncDoneResult<T>;

export const useAsync = <T>(
    callback: (signal: AbortSignal) => PromiseLike<T>,
    deps: DependencyList,
): UseAsyncResult<T> => {
    const [result, setResult] = useState<UseAsyncResult<T>>({
        state: UseAsyncState.unknown,
    });

    useEffect(() => {
        setResult({
            state: UseAsyncState.unknown,
        });
        const controller = new AbortController();
        const { signal } = controller;
        callback(signal).then(
            value => {
                if (!signal.aborted) {
                    setResult({
                        state: UseAsyncState.done,
                        value,
                    });
                }
            },
            error => {
                if (!signal.aborted) {
                    setResult({
                        state: UseAsyncState.error,
                        error,
                    });
                }
            },
        );
        return () => {
            controller.abort();
        };
    }, [...deps, setResult]);

    return result;
};
