import { readable, derived, type Readable } from 'svelte/store';

export type SSEStatus = 'connecting' | 'open' | 'closed' | 'error';

export interface SSEStore<T> {
  data: Readable<T | null>;
  status: Readable<SSEStatus>;
}

/**
 * Create a Svelte readable store backed by an SSE endpoint.
 * The EventSource auto-reconnects on drop; the store reflects the latest
 * value of the named event. Closes cleanly when the last subscriber leaves.
 *
 * A single EventSource is shared between the `data` and `status` stores to
 * avoid opening two HTTP connections to the same endpoint.
 */
export function sseStore<T>(url: string, eventName: string): SSEStore<T> {
  // Internal store that owns the EventSource lifetime.
  const _es = readable<EventSource | null>(null, (set) => {
    const es = new EventSource(url);
    set(es);
    return () => {
      es.close();
      set(null);
    };
  });

  const data = derived<typeof _es, T | null>(_es, (es, set) => {
    if (!es) return;
    const handler = (e: MessageEvent) => {
      try {
        set(JSON.parse(e.data) as T);
      } catch {
        // malformed JSON — ignore
      }
    };
    es.addEventListener(eventName, handler);
    return () => es.removeEventListener(eventName, handler);
  }, null);

  const status = derived<typeof _es, SSEStatus>(_es, (es, set) => {
    if (!es) { set('closed'); return; }
    set('connecting');
    const onOpen = () => set('open');
    const onError = () =>
      set(es.readyState === EventSource.CLOSED ? 'closed' : 'error');
    es.addEventListener('open', onOpen);
    es.addEventListener('error', onError);
    return () => {
      es.removeEventListener('open', onOpen);
      es.removeEventListener('error', onError);
    };
  }, 'connecting');

  return { data, status };
}

/**
 * Subscribe to an SSE endpoint and collect every matching event into an
 * append-only array (useful for an event log).
 */
export function sseLog<T>(url: string, eventName: string, maxItems = 100): Readable<T[]> {
  return readable<T[]>([], (set) => {
    let items: T[] = [];
    const es = new EventSource(url);

    es.addEventListener(eventName, (e: MessageEvent) => {
      try {
        const item = JSON.parse(e.data) as T;
        items = [item, ...items].slice(0, maxItems);
        set(items);
      } catch {
        // ignore
      }
    });

    return () => es.close();
  });
}
