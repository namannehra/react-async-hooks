import { DependencyList, useCallback, useEffect, useState } from 'react';

export const useAsyncCallback = <T extends unknown[], U>(
    callback: (signal: AbortSignal, ...args: T) => U,
    deps: DependencyList,
): ((...args: T) => U) => {
    const [controller, setController] = useState<AbortController>();

    useEffect(() => {
        if (!controller) {
            return;
        }
        return () => {
            controller.abort();
        };
    }, [controller]);

    return useCallback(
        (...args: T) => {
            const controller = new AbortController();
            const { signal } = controller;
            setController(controller);
            return callback(signal, ...args);
        },
        [...deps, setController],
    );
};
