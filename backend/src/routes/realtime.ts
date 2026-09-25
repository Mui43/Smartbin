import {
  Router,
  Request,
  Response,
} from "express";

const router = Router();

const clients = new Set<Response>();

router.get(
  "/",
  (req: Request, res: Response) => {
    res.setHeader(
      "Content-Type",
      "text/event-stream"
    );

    res.setHeader(
      "Cache-Control",
      "no-cache, no-transform"
    );

    res.setHeader(
      "Connection",
      "keep-alive"
    );

    res.flushHeaders();

    clients.add(res);

    console.log(
      `🔌 SSE client connected (${clients.size})`
    );

    res.write(
      `event: connected\n`
    );

    res.write(
      `data: ${JSON.stringify({
        connected: true,
      })}\n\n`
    );

    req.on("close", () => {
      clients.delete(res);

      console.log(
        `🔌 SSE client disconnected (${clients.size})`
      );
    });
  }
);

export function broadcastRealtime(
  data: unknown,
  event = "telemetry"
) {
  const message =
    `event: ${event}\n` +
    `data: ${JSON.stringify(data)}\n\n`;

  for (const client of clients) {
    try {
      client.write(message);
    } catch (error) {
      clients.delete(client);

      console.error(
        "❌ SSE client write error:",
        error
      );
    }
  }
}

export default router;