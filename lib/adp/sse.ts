// Minimal server-sent-events framing, for reading an ADP chat stream.
//
// Pure and incremental: a chunk boundary can fall anywhere, so the parser keeps
// the tail of a half-written event and only emits complete ones (an event ends
// at a blank line, per the EventSource spec).

export interface SseEvent {
  /** The `event:` field; "" when the block did not name one. */
  event: string;
  /** The `data:` field(s), joined by newlines. */
  data: string;
}

export interface SseParser {
  /** Complete events contained in everything pushed so far. */
  push(chunk: string): SseEvent[];
  /** A final block not terminated by a blank line (last event before EOF). */
  flush(): SseEvent[];
}

function parseBlock(block: string): SseEvent | null {
  let event = '';
  const data: string[] = [];
  for (const rawLine of block.split('\n')) {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
    if (line === '' || line.startsWith(':')) continue; // blank or comment
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    // One optional space after the colon belongs to the delimiter, not the value.
    const value = colon === -1 ? '' : line.slice(line[colon + 1] === ' ' ? colon + 2 : colon + 1);
    if (field === 'event') event = value;
    else if (field === 'data') data.push(value);
  }
  return event === '' && data.length === 0 ? null : { event, data: data.join('\n') };
}

export function createSseParser(): SseParser {
  let buffer = '';
  return {
    push(chunk: string): SseEvent[] {
      buffer += chunk;
      const events: SseEvent[] = [];
      for (;;) {
        const end = buffer.search(/\r?\n\r?\n/);
        if (end === -1) break;
        const block = buffer.slice(0, end);
        buffer = buffer.slice(end).replace(/^\r?\n\r?\n/, '');
        const parsed = parseBlock(block);
        if (parsed) events.push(parsed);
      }
      return events;
    },
    flush(): SseEvent[] {
      const rest = buffer;
      buffer = '';
      const parsed = rest.trim() === '' ? null : parseBlock(rest);
      return parsed ? [parsed] : [];
    },
  };
}
