import { act, renderHook } from '@testing-library/react-hooks';

import { useAsyncCallback } from '../src';

test('Initial state', () => {
    const { result } = renderHook(() => useAsyncCallback(async () => {}, []));
    expect(result.current[1].state).toBe('pending');
});

describe('Callback called', () => {
    test('Pending', async () => {
        const { result } = renderHook(() =>
            useAsyncCallback(() => new Promise(() => {}), []),
        );
        const { result: controlResult } = renderHook(() =>
            useAsyncCallback(async () => {}, []),
        );
        await act(async () => {
            result.current[0]();
            await controlResult.current[0]();
        });
        expect(controlResult.current[1].state).toBe('fulfilled');
        expect(result.current[1].state).toBe('pending');
    });

    test('Rejected', async () => {
        const reason = Symbol();
        const { result } = renderHook(() =>
            useAsyncCallback(async () => {
                throw reason;
            }, []),
        );
        await act(async () => {
            let error;
            try {
                await result.current[0]();
            } catch (_error) {
                error = _error;
            }
            expect(error).toBe(reason);
        });
        expect(result.current[1].state).toBe('rejected');
        expect(result.current[1].reason).toBe(reason);
    });

    test('Fulfilled', async () => {
        const value = Symbol();
        const { result } = renderHook(() =>
            useAsyncCallback(async () => value, []),
        );
        await act(async () => {
            expect(await result.current[0]()).toBe(value);
        });
        expect(result.current[1].state).toBe('fulfilled');
        expect(result.current[1].value).toBe(value);
    });
});

test('Dependencies change', async () => {
    let signal: AbortSignal;
    let resolve: () => void;
    const { rerender, result } = renderHook(
        (args: Parameters<typeof useAsyncCallback>) =>
            useAsyncCallback(...args),
        {
            initialProps: [
                ({ signal: _signal }) => {
                    signal = _signal;
                    return new Promise<void>(_resolve => {
                        resolve = _resolve;
                    });
                },
                [0],
            ],
        },
    );
    act(() => {
        result.current[0]();
    });
    const value = Symbol();
    rerender([async () => value, [1]]);
    expect(signal!.aborted).toBe(true);
    await act(async () => {
        await result.current[0]();
        resolve!();
    });
    expect(result.current[1].value).toBe(value);
});

test('Dependencies no change', async () => {
    let signal: AbortSignal;
    const value = Symbol();
    const { rerender, result } = renderHook(
        (args: Parameters<typeof useAsyncCallback>) =>
            useAsyncCallback(...args),
        {
            initialProps: [
                async ({ signal: _signal }) => {
                    signal = _signal;
                    return value;
                },
                [0],
            ],
        },
    );
    const callback = jest.fn(async () => {});
    rerender([callback, [0]]);
    await act(async () => {
        await result.current[0]();
    });
    expect(signal!.aborted).toBe(false);
    expect(callback).toHaveBeenCalledTimes(0);
});
