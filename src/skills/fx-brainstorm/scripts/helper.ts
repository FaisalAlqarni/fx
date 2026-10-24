// Injected into every companion page by server.cjs; scripts/build wraps it in
// an IIFE, so these names stay out of the page's global scope. Type-checked
// against the DOM by tsconfig.browser.json, and by nothing else.

interface Window {
  selectedChoice: string | null | undefined;
  toggleSelect: (el: HTMLElement) => void;
  brainstorm: {
    send: (event: Record<string, unknown>) => void;
    choice: (value: unknown, metadata?: object) => void;
  };
}

const MIN_RECONNECT_MS = 500;
const MAX_RECONNECT_MS = 30000;
const TOMBSTONE_AFTER_MS = 15000; // show the "paused" overlay after this long disconnected

// Next backoff delay: doubles, capped.
function nextReconnectDelay(current: number, max: number): number {
  return Math.min(current * 2, max);
}

// Browser-only; skipped when the file is loaded outside a page.
if (typeof window !== 'undefined') runCompanion();

function runCompanion(): void {
  let ws: WebSocket | null = null;
  let eventQueue: Record<string, unknown>[] = [];
  let reconnectDelay = MIN_RECONNECT_MS;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let disconnectedSince: number | null = null;
  let everConnected = false;
  let tombstoneShown = false;

  function sessionKey(): string | null {
    try {
      return window.sessionStorage && window.sessionStorage.getItem('brainstorm-session-key');
    } catch {}
    return null;
  }

  function websocketUrl(): string {
    const key = sessionKey();
    return 'ws://' + window.location.host + (key ? '/?key=' + encodeURIComponent(key) : '');
  }

  function reloadAfterRecovery(): void {
    const key = sessionKey();
    if (key) {
      window.location.replace('/?key=' + encodeURIComponent(key));
    } else {
      window.location.reload();
    }
  }

  // Reflect connection state in the frame's status pill (absent on full-doc screens).
  function setStatus(state: 'connecting' | 'connected' | 'reconnecting' | 'disconnected'): void {
    const el = document.querySelector<HTMLElement>('.status');
    if (!el) return;
    const map = {
      connecting:   ['Connecting…',   'var(--text-tertiary)'],
      connected:    ['Connected',     'var(--success)'],
      reconnecting: ['Reconnecting…', 'var(--warning)'],
      disconnected: ['Disconnected',  'var(--error)']
    } as const;
    const [text, color] = map[state];
    el.textContent = text;
    el.style.setProperty('--status-color', color);
  }

  // Self-styled so it works on framed and full-document screens alike.
  function showTombstone(): void {
    if (tombstoneShown) return;
    tombstoneShown = true;
    const el = document.createElement('div');
    el.id = 'bs-tombstone';
    el.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;' +
      'align-items:center;justify-content:center;padding:2rem;text-align:center;' +
      'background:rgba(20,20,22,0.92);color:#f5f5f7;font-family:system-ui,sans-serif';
    el.innerHTML = '<div style="max-width:480px">' +
      '<h2 style="margin:0 0 .5rem;font-weight:600">Companion paused</h2>' +
      '<p style="margin:0;opacity:.85">This brainstorm companion has stopped. ' +
      'Ask your coding agent to bring it back. This page reconnects automatically.</p></div>';
    if (document.body) document.body.appendChild(el);
  }

  function connect(): void {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    setStatus(everConnected ? 'reconnecting' : 'connecting');
    const socket = new WebSocket(websocketUrl());
    ws = socket;

    socket.onopen = () => {
      const recovered = tombstoneShown;
      everConnected = true;
      disconnectedSince = null;
      reconnectDelay = MIN_RECONNECT_MS;
      tombstoneShown = false;
      setStatus('connected');
      eventQueue.forEach(e => socket.send(JSON.stringify(e)));
      eventQueue = [];
      // Recovered from a tombstoned outage (e.g. the server restarted on the same
      // port): reload through the keyed bootstrap when possible so the cookie is
      // refreshed before the visible URL returns to bare /.
      if (recovered) reloadAfterRecovery();
    };

    socket.onmessage = (msg: MessageEvent) => {
      let data: unknown;
      try { data = JSON.parse(String(msg.data)); } catch { return; } // ts-gate-ok: browser script, no lib/ require
      if (typeof data === 'object' && data !== null && 'type' in data && data.type === 'reload') window.location.reload();
    };

    socket.onclose = () => {
      ws = null;
      if (disconnectedSince === null) disconnectedSince = Date.now();
      if (Date.now() - disconnectedSince >= TOMBSTONE_AFTER_MS) {
        setStatus('disconnected');
        showTombstone();
      } else {
        setStatus('reconnecting');
      }
      reconnectTimer = setTimeout(connect, reconnectDelay);
      reconnectDelay = nextReconnectDelay(reconnectDelay, MAX_RECONNECT_MS);
    };

    // Let onclose own reconnection so we don't schedule it twice.
    socket.onerror = () => { try { ws?.close(); } catch {} };
  }

  function sendEvent(event: Record<string, unknown>): void {
    event.timestamp = Date.now();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    } else {
      eventQueue.push(event);
    }
  }

  // Capture clicks on choice elements
  document.addEventListener('click', (e) => {
    if (!(e.target instanceof Element)) return;
    const target = e.target.closest<HTMLElement>('[data-choice]');
    if (!target) return;

    sendEvent({
      type: 'click',
      text: (target.textContent ?? '').trim(),
      choice: target.dataset.choice,
      id: target.id || null
    });

  });

  // Frame UI: selection tracking
  window.selectedChoice = null;

  window.toggleSelect = function(el) {
    const container = el.closest<HTMLElement>('.options') || el.closest<HTMLElement>('.cards');
    const multi = container && container.dataset.multiselect !== undefined;
    if (container && !multi) {
      container.querySelectorAll('.option, .card').forEach(o => o.classList.remove('selected'));
    }
    if (multi) {
      el.classList.toggle('selected');
    } else {
      el.classList.add('selected');
    }
    window.selectedChoice = el.dataset.choice;
  };

  // Expose API for explicit use
  window.brainstorm = {
    send: sendEvent,
    choice: (value, metadata = {}) => sendEvent({ type: 'choice', value, ...metadata })
  };

  connect();
}
