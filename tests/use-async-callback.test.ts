import { act, renderHook } from '@testing-library/react-hooks';

import { useAsyncCallback } from '../src';

test('Deps changed', () => {
    let signal: AbortSignal;
    const { rerender, result } = renderHook(
        (args: [(signal: AbortSignal) => unknown, unknown[]]) => useAsyncCallback(...args),
        {
            initialProps: [
                signal2 => {
                    signal = signal2;
                },
                [1],
            ],
        },
    );
    act(() => {
        result.current();
    });
    const value = {};
    rerender([() => value, [2]]);
    act(() => {
        expect(result.current()).toBe(value);
    });
    expect(signal!.aborted).toBe(true);
});

test('Deps unchanged', () => {
    let signal: AbortSignal;
    const value = {};
    const { rerender, result } = renderHook(
        (args: [(signal: AbortSignal) => unknown, unknown[]]) => useAsyncCallback(...args),
        {
            initialProps: [
                signal2 => {
                    signal = signal2;
                    return value;
                },
                [1],
            ],
        },
    );
    rerender([() => {}, [1]]);
    act(() => {
        expect(result.current()).toBe(value);
    });
    expect(signal!.aborted).toBe(false);
});
