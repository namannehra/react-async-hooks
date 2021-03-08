React hooks for async tasks

There are two hooks, `useAsync` and `useAsyncCallback`. `useAsync` is like `useEffect`. It will run
when dependencies change. `useAsyncCallback` is like `useCallback`. It returns a function. Both
hooks support aborting using an
[AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal).

## `useAsync`

### Basic

```js
import { useAsync } from 'react-async-hooks';

const fetchMessage = async id => {
    // Fetch data using id
};

const Message = props => {
    const { state, error, value } = useAsync(() => fetchMessage(props.id), [props.id]);
    return <div>{/* ... */}</div>;
};
```

`fetchMessage` will be called when `props.id` changes. `state` will be `'unknown'`, `'error'` or
`'done'`. If `state` is not `'done'` then value will be `undefined`. If `state` is not `'error'`
then `error` will be `undefined`.

### Aborting

```js
import { useAsync } from 'react-async-hooks';

const fetchMessage = async (id, signal) => {
    // Fetch data using id
    // Cancel fetch using signal and throw error
};

const Message = props => {
    const { state, error, value } = useAsync(signal => fetchMessage(props.id, signal), [props.id]);
    return <div>{/* ... */}</div>;
};
```

Any error thrown by `fetchMessage` after aborting will be caught. `signal` is an `AbortSignal`.

## `useAsyncCallback`

```js
import { useState } from 'react';
import { useAsyncCallback } from 'react-async-hooks';

const fetchMessage = async (id, signal) => {
    // Fetch data using id
    // Cancel fetch using signal and throw error
};

const Message = props => {
    const [message, setMessage] = useState();

    const updateMessage = useAsyncCallback(
        async signal => {
            try {
                const message = await fetchMessage(props.id, signal);
                setMessage(message);
            } catch (error) {
                if (!signal.aborted) {
                    throw error;
                }
            }
        },
        [props.id, setMessage],
    );

    return (
        <div>
            <button onClick={updateMessage}>Update message</button>
            <div>{/* ... */}</div>
        </div>
    );
};
```

`fetchMessage` will be called when button is clicked. Any error thrown due to aborting must be
handled.

## Race conditions

Wrong:

```js
import { useState } from 'react';
import { useAsync } from 'react-async-hooks';

const fetchMessage = async id => {
    // Fetch data using id
};

const Message = props => {
    const [message, setMessage] = useState();

    useAsync(async () => {
        const message = await fetchMessage(props.id);
        setMessage(message);
    }, [props.id]);

    return <div>{/* ... */}</div>;
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
    // Fetch data using id
};

const Message = props => {
    const [message, setMessage] = useState();

    useAsync(
        async signal => {
            const message = await fetchMessage(props.id);
            if (!signal.aborted) {
                setMessage(message);
            }
        },
        [props.id],
    );

    return <div>{/* ... */}</div>;
};
```

## API

### `useAsync<T>(callback, deps) => result`

-   `callback`: `(signal: AbortSignal) => PromiseLike<T>`

-   `deps`: `Array`

-   `result`: `Object`

-   `result.state`: `'unknown' | 'error' | 'done'`

-   `result.error`: `any | undefined`

-   `result.value`: `T | undefined`

-   `PromiseLike` can be any [Promises/A+](https://promisesaplus.com) compliant promise.

### `useAsyncCallback<T, U>(callback, deps) => result`

-   `callback`: `(signal: AbortSignal, ...args: T) => U`

-   `deps`: `Array`

-   `result`: `(...args: T) => U`

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
                "additionalHooks": "(useAsync|useAsyncCallback)"
            }
        ]
    }
}
```
