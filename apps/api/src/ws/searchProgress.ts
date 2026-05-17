import type { IncomingMessage } from "http";
import type { Duplex } from "stream";
import type { WebSocket } from "ws";
import { WebSocketServer } from "ws";

const subs = new Map<string, Set<WebSocket>>();

function getJobId(req: IncomingMessage): string | null {
  const host = req.headers.host ?? "localhost";
  const url = new URL(req.url ?? "/", `http://${host}`);
  if (url.pathname !== "/ws") return null;
  return url.searchParams.get("jobId");
}

export function handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer, wss: WebSocketServer) {
  const jobId = getJobId(req);
  if (!jobId) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    let set = subs.get(jobId);
    if (!set) {
      set = new Set();
      subs.set(jobId, set);
    }
    set.add(ws);
    ws.send(JSON.stringify({ type: "hello", jobId }));
    ws.on("close", () => {
      set?.delete(ws);
    });
  });
}

export function broadcast(jobId: string, message: unknown) {
  const set = subs.get(jobId);
  if (!set) return;
  const payload = JSON.stringify(message);
  for (const ws of set) {
    if (ws.readyState === 1) ws.send(payload);
  }
}
