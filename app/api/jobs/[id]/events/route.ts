import { jobExists, subscribe } from '@/lib/jobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!jobExists(id)) {
    return new Response('Unknown job', { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const send = (event: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      const heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(': keep-alive\n\n'));
      }, 5000);

      const unsubscribeRef: { off: () => void } = { off: () => {} };
      const finish = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribeRef.off();
        try {
          controller.close();
        } catch {}
      };

      const unsubscribe = subscribe(id, (event) => {
        if (closed) return;
        send(event);
        if (event.type !== 'stage') finish();
      });
      unsubscribeRef.off = unsubscribe;

      request.signal.addEventListener('abort', finish);
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  });
}
