import { renderHook } from '@testing-library/react-hooks';

import { useAsync, UseAsyncState } from '../src';

describe('Initial state', () => {
    test('Unknown state', () => {
        const { result } = renderHook(() => useAsync(() => new Promise(() => {}), []));
        expect(result.current.state).toBe(UseAsyncState.unknown);
    });

    test('Error state', async () => {
        const error = {};
        const { result, waitForNextUpdate } = renderHook(() =>
            useAsync(() => Promise.reject(error), []),
        );
        await waitForNextUpdate();
        expect(result.current.state).toBe(UseAsyncState.error);
        expect(result.current.error).toBe(error);
    });

    test('Done state', async () => {
        const value = {};
        const { result, waitForNextUpdate } = renderHook(() =>
            useAsync(() => Promise.resolve(value), []),
        );
        await waitForNextUpdate();
        expect(result.current.state).toBe(UseAsyncState.done);
        expect(result.current.value).toBe(value);
    });
});

describe('State change', () => {
    test('Unknown to error state', async () => {
        let reject: (error?: unknown) => void;
        const promise = new Promise((_resolve, reject2) => {
            reject = reject2;
        });
        const { result, waitForNextUpdate } = renderHook(() => useAsync(() => promise, []));
        expect(result.current.state).toBe(UseAsyncState.unknown);
        const error = {};
        reject!(error);
        await waitForNextUpdate();
        expect(result.current.state).toBe(UseAsyncState.error);
        expect(result.current.error).toBe(error);
    });

    test('Unknown to done state', async () => {
        let resolve: (value?: unknown) => void;
        const promise = new Promise(resolve2 => {
            resolve = resolve2;
        });
        const { result, waitForNextUpdate } = renderHook(() => useAsync(() => promise, []));
        expect(result.current.state).toBe(UseAsyncState.unknown);
        const value = {};
        resolve!(value);
        await waitForNextUpdate();
        expect(result.current.state).toBe(UseAsyncState.done);
        expect(result.current.value).toBe(value);
    });
});

describe('Deps changed', () => {
    test('Resolve after deps changed', async () => {
        let signal: AbortSignal;
        let resolve: (value?: unknown) => void;
        const { rerender, result, waitForNextUpdate } = renderHook(
            (args: [(signal: AbortSignal) => Promise<unknown>, unknown[]]) => useAsync(...args),
            {
                initialProps: [
                    (signal2: AbortSignal) => {
                        signal = signal2;
                        return new Promise(resolve2 => {
                            resolve = resolve2;
                        });
                    },
                    [1],
                ],
            },
        );
        rerender([() => Promise.reject(), [2]]);
        expect(signal!.aborted).toBe(true);
        resolve!();
        await waitForNextUpdate();
        expect(result.current.state).toBe(UseAsyncState.error);
    });

    test('Reject after deps changed', async () => {
        let signal: AbortSignal;
        let reject: (error?: unknown) => void;
        const { rerender, result, waitForNextUpdate } = renderHook(
            (args: [(signal: AbortSignal) => Promise<unknown>, unknown[]]) => useAsync(...args),
            {
                initialProps: [
                    (signal2: AbortSignal) => {
                        signal = signal2;
                        return new Promise((_resolve, reject2) => {
                            reject = reject2;
                        });
                    },
                    [1],
                ],
            },
        );
        rerender([() => Promise.resolve(), [2]]);
        expect(signal!.aborted).toBe(true);
        reject!();
        await waitForNextUpdate();
        expect(result.current.state).toBe(UseAsyncState.done);
    });
});

test('Deps unchanged', () => {
    let signal: AbortSignal;
    const { rerender } = renderHook(
        (args: [(signal: AbortSignal) => Promise<unknown>, unknown[]]) => useAsync(...args),
        {
            initialProps: [
                (signal2: AbortSignal) => {
                    signal = signal2;
                    return new Promise(() => {});
                },
                [1],
            ],
        },
    );
    const callback = jest.fn(() => new Promise(() => {}));
    rerender([callback, [1]]);
    expect(signal!.aborted).toBe(false);
    expect(callback).toBeCalledTimes(0);
});
