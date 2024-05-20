React hooks for promises. There are three hooks:

-   `useAsync`: This is like `useMemo` or `useEffect`.

-   `useAsyncCallback`: This is like `useCallback`.

-   `useAsyncVoidCallback`. This is also like `useCallback` but it doesn't return or throw.

All hooks support aborting using an
[`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal).

## `useAsync`

### Basic

```js
import { useAsync } from 'react-async-hooks';

const fetchMessage = async id => {
    const response = await fetch(`https://example.com/${id}`);
    return await response.text();
};

const Message = props => {
    const { state, reason, value } = useAsync(() => fetchMessage(props.id), [props.id]);

    if (state === 'pending') {
        return 'Loading';
    }
    if (reason) {
        return 'Error';
    }
    return value;
};
```

`fetchMessage` will be called when `props.id` changes. `state` will be `'pending'`, `'rejected'` or
`'fulfilled'`. `value` will be defined if `state` is `'fulfilled'`. `reason` will be defined if
`state` is `'rejected'`.

### Aborting

```js
import { useAsync } from 'react-async-hooks';

const fetchMessage = async (id, signal) => {
    const response = await fetch(`https://example.com/${id}`, { signal });
    return await response.text();
};

const Message = props => {
    const { state, reason, value } = useAsync(
        ({ signal }) => fetchMessage(props.id, signal),
        [props.id],
    );

    if (state === 'pending') {
        return 'Loading';
    }
    if (reason) {
        return 'Error';
    }
    return value;
};
```

`signal` is an [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal). Old
signals will be aborted when `props.id` changes or component unmounts. Values returned and errors
thrown after aborting will be ignored.

### Keeping `state` as `'pending'`

```js
import { useAsync } from 'react-async-hooks';

const fetchMessage = async id => {
    const response = await fetch(`https://example.com/${id}`);
    return await response.text();
};

const Message = props => {
    const { state, reason, value } = useAsync(
        async ({ pending }) => {
            if (props.id === undefined) {
                return pending;
            }
            return await fetchMessage(props.id);
        },
        [props.id],
    );

    if (state === 'pending') {
        return 'Loading';
    }
    if (reason) {
        return 'Error';
    }
    return value;
};
```

`state` will stay as `'pending'` till `props.id` is `undefined`.

## `useAsyncCallback`

```js
import { useAsyncCallback } from 'react-async-hooks';

const fetchMessage = async (id, signal) => {
    const response = await fetch(`https://example.com/${id}`, { signal });
    return await response.text();
};

const Message = props => {
    const [callback, { state, reason, value }] = useAsyncCallback(
        async ({ signal }) => {
            try {
                return await fetchMessage(props.id);
            } catch (error) {
                if (!signal.aborted) {
                    throw error;
                }
            }
        },
        [props.id],
    );

    let message;
    if (state === 'pending') {
        message = 'Loading';
    } else if (reason) {
        message = 'Error';
    } else {
        message = value;
    }
    return (
        <div>
            <button onClick={callback}>Update message</button>
            <div>{message}</div>
        </div>
    );
};
```

`fetchMessage` will be called when button is clicked. If an error is thrown inside
`useAsyncCallback` then `callback` will reject with the same error. If a value is returned inside
`useAsyncCallback` then `callback` will fulfill with the same value.

## `useAsyncVoidCallback`

```js
import { useAsyncVoidCallback } from 'react-async-hooks';

const fetchMessage = async (id, signal) => {
    const response = await fetch(`https://example.com/${id}`, { signal });
    return await response.text();
};

const Message = props => {
    const [callback, { state, reason, value }] = useAsyncVoidCallback(
        async ({ pending, signal }) => {
            if (props.id === undefined) {
                return pending;
            }
            return await fetchMessage(props.id);
        },
        [props.id],
    );

    let message;
    if (state === 'pending') {
        message = 'Loading';
    } else if (reason) {
        message = 'Error';
    } else {
        message = value;
    }
    return (
        <div>
            <button onClick={callback}>Update message</button>
            <div>{message}</div>
        </div>
    );
};
```

`fetchMessage` will be called when button is clicked. `callback` will never reject and will always
be fulfilled with `void`.

## Race conditions

Wrong:

```js
import { useState } from 'react';
import { useAsync } from 'react-async-hooks';

const fetchMessage = async id => {
    const response = await fetch(`https://example.com/${id}`);
    return await response.text();
};

const Message = props => {
    const [message, setMessage] = useState();
    useAsync(async () => {
        const message = await fetchMessage(props.id);
        setMessage(message);
    }, [props.id]);

    if (state === 'pending') {
        return 'Loading';
    }
    if (reason) {
        return 'Error';
    }
    return value;
};
```

Here it's possible that an old `fetchMessage` call resolves after a new `fetchMessage` call. This is
handled automatically in the value returned by `useAsync` but if state is changed inside the
callback passed to `useAsync` or `useAsyncCallback` then `signal.aborted` should be checked before
changing state.

Correct:

```js
import { useState } from 'react';
import { useAsync } from 'react-async-hooks';

const fetchMessage = async id => {
    const response = await fetch(`https://example.com/${id}`);
    return await response.text();
};

const Message = props => {
    const [message, setMessage] = useState();
    useAsync(
        async ({ signal }) => {
            const message = await fetchMessage(props.id);
            if (!signal.aborted) {
                setMessage(message);
            }
        },
        [props.id],
    );

    if (state === 'pending') {
        return 'Loading';
    }
    if (reason) {
        return 'Error';
    }
    return value;
};
```

## API

### Common

```ts
type UseAsyncPendingResult = {
    state: 'pending';
};

type UseAsyncRejectedResult = {
    state: 'rejected';
    reason: Reason;
};

type UseAsyncFulfilledResult = {
    state: 'fulfilled';
    value: Value;
};

type UseAsyncResult = UseAsyncPendingResult | UseAsyncRejectedResult | UseAsyncFulfilledResult;
```

### `useAsync`

```ts
function useAsync(
    fn: (options: { pending: Pending; signal: AbortSignal }) => Promise<Value | Pending>,
    deps: any[],
): UseAsyncResult;
```

### `useAsyncCallback`

```ts
type Callback = (...args: Args) => Promise<Value>;

function useAsyncCallback(
    fn: (options: { signal: AbortSignal }, ...args: Args) => Promise<Value>,
    deps: any[],
): [Callback, UseAsyncResult];
```

### `useAsyncVoidCallback`

```ts
type Callback = (...args: Args) => Promise<void>;

function useAsyncVoidCallback(
    fn: (
        options: { pending: Pending; signal: AbortSignal },
        ...args: Args
    ) => Promise<Value | Pending>,
    deps: any[],
): [Callback, UseAsyncResult];
```

## ESLint

Use `additionalHooks` option of
[eslint-plugin-react-hooks](https://www.npmjs.com/package/eslint-plugin-react-hooks) to check for
incorrect dependencies.

```json
{
    "rules": {
        "react-hooks/exhaustive-deps": [
            "error",
            {
                "additionalHooks": "(useAsync|useAsyncCallback|useAsyncVoidCallback)"
            }
        ]
    }
}
```
