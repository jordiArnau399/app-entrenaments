import { freshAuth, supabaseConfig } from './auth';

/** Escolta insercions i lectures de la taula messages. Si el socket falla, la sincronització periòdica ho cobreix. */
export function subscribeMessages(onChange: () => void): () => void {
  const config = supabaseConfig();
  if (!config || typeof WebSocket === 'undefined') return () => undefined;
  let socket: WebSocket | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let closed = false;
  let ref = 0;

  const nextRef = () => String(++ref);

  const start = async () => {
    const session = await freshAuth();
    if (!session || closed) return;
    const url = `${config.url.replace(/^http/, 'ws')}/realtime/v1/websocket?apikey=${encodeURIComponent(config.anonKey)}&vsn=1.0.0`;
    socket = new WebSocket(url);
    socket.onopen = () => {
      const joinRef = nextRef();
      socket?.send(JSON.stringify({
        topic: 'realtime:public:messages',
        event: 'phx_join',
        payload: {
          access_token: session.accessToken,
          config: {
            broadcast: { ack: false, self: false },
            presence: { key: '' },
            postgres_changes: [{ event: '*', schema: 'public', table: 'messages' }],
          },
        },
        ref: joinRef,
        join_ref: joinRef,
      }));
    };
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(String(event.data)) as { event?: string; payload?: { data?: { record?: unknown } } };
        if (data.event === 'postgres_changes' || data.payload?.data?.record) onChange();
      } catch {
        // Ignorem missatges que no són JSON.
      }
    };
    heartbeat = setInterval(() => {
      socket?.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: nextRef() }));
    }, 25000);
  };

  start().catch(() => undefined);

  return () => {
    closed = true;
    if (heartbeat) clearInterval(heartbeat);
    socket?.close();
  };
}
