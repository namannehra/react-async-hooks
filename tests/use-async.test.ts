import { renderHook } from '@testing-library/react-hooks';

import { useAsync } from '../src';

describe('Initial state', () => {
    test('Pending', () => {
        const { result } = renderHook(() => useAsync(() => new Promise(() => {}), []));
        expect(result.current.state).toBe('pending');
    });

    test('Rejected', async () => {
        const reason = Symbol();
        const { result, waitForNextUpdate } = renderHook(() =>
            useAsync(async () => {
                throw reason;
            }, []),
        );
        expect(result.current.state).toBe('pending');
        await waitForNextUpdate();
        expect(result.current.state).toBe('rejected');
        expect(result.current.reason).toBe(reason);
    });

    test('Fulfilled', async () => {
        const value = Symbol();
        const { result, waitForNextUpdate } = renderHook(() => useAsync(async () => value, []));
        expect(result.current.state).toBe('pending');
        await waitForNextUpdate();
        expect(result.current.state).toBe('fulfilled');
        expect(result.current.value).toBe(value);
    });
});

describe('State change', () => {
    test('Pending to rejected', async () => {
        const reason = Symbol();
        let reject: (_: typeof reason) => void;
        const { result, waitForNextUpdate } = renderHook(() =>
            useAsync(
                () =>
                    new Promise((_, _reject) => {
                        reject = _reject;
                    }),
                [],
            ),
        );
        reject!(reason);
        await waitForNextUpdate();
        expect(result.current.state).toBe('rejected');
        expect(result.current.reason).toBe(reason);
    });

    test('Pending to fulfilled', async () => {
        const value = Symbol();
        let resolve: (_: typeof value) => void;
        const { result, waitForNextUpdate } = renderHook(() =>
            useAsync(
                () =>
                    new Promise<typeof value>(_resolve => {
                        resolve = _resolve;
                    }),
                [],
            ),
        );
        resolve!(value);
        await waitForNextUpdate();
        expect(result.current.state).toBe('fulfilled');
        expect(result.current.value).toBe(value);
    });
});

test('Return pending', async () => {
    const { result } = renderHook(() => useAsync(async ({ pending }) => pending, []));
    const { result: controlResult, waitForNextUpdate } = renderHook(() =>
        useAsync(async () => {}, []),
    );
    await waitForNextUpdate();
    expect(controlResult.current.state).toBe('fulfilled');
    expect(result.current.state).toBe('pending');
});

describe('Dependencies change', () => {
    test('Signal should be aboretd', async () => {
        let signal: AbortSignal;
        const { rerender } = renderHook((args: Parameters<typeof useAsync>) => useAsync(...args), {
            initialProps: [
                async ({ signal: _signal }) => {
                    signal = _signal;
                },
                [0],
            ],
        });
        rerender([async () => {}, [1]]);
        expect(signal!.aborted).toBe(true);
    });

    test('Pending after change', async () => {
        const { rerender, result, waitForNextUpdate } = renderHook(
            (args: Parameters<typeof useAsync>) => useAsync(...args),
            {
                initialProps: [async () => {}, [0]],
            },
        );
        await waitForNextUpdate();
        rerender([() => new Promise(() => {}), [1]]);
        expect(result.current.state).toBe('pending');
    });

    test('Reject after change', async () => {
        let resolve: (value?: unknown) => void;
        const { rerender, result, waitForNextUpdate } = renderHook(
            (args: Parameters<typeof useAsync>) => useAsync(...args),
            {
                initialProps: [
                    () =>
                        new Promise(_resolve => {
                            resolve = _resolve;
                        }),
                    [0],
                ],
            },
        );
        rerender([() => Promise.reject(), [1]]);
        resolve!();
        await waitForNextUpdate();
        expect(result.current.state).toBe('rejected');
    });

    test('Resolve after change', async () => {
        let reject: (reason?: unknown) => void;
        const { rerender, result, waitForNextUpdate } = renderHook(
            (args: Parameters<typeof useAsync>) => useAsync(...args),
            {
                initialProps: [
                    () =>
                        new Promise((_, _reject) => {
                            reject = _reject;
                        }),
                    [0],
                ],
            },
        );
        rerender([() => Promise.resolve(), [1]]);
        reject!();
        await waitForNextUpdate();
        expect(result.current.state).toBe('fulfilled');
    });
});

test('Dependencies no change', () => {
    let signal: AbortSignal;
    const { rerender } = renderHook((args: Parameters<typeof useAsync>) => useAsync(...args), {
        initialProps: [
            async ({ signal: _signal }) => {
                signal = _signal;
            },
            [0],
        ],
    });
    const callback = jest.fn(async () => {});
    rerender([callback, [0]]);
    expect(signal!.aborted).toBe(false);
    expect(callback).toHaveBeenCalledTimes(0);
});
