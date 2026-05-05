import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { Redis } from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";

const PORT = parseInt(process.env["PORT"] ?? "8080", 10);
const REDIS_URL = process.env["REDIS_URL"];
const CORS_ORIGIN = process.env["CORS_ORIGIN"] ?? "http://localhost:3000";

const app = express();

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
  },
});

function attachRedisAdapter() {
  if (!REDIS_URL) {
    console.warn(
      "REDIS_URL not set — running without Redis adapter (single-node only, not suitable for production)"
    );
    return;
  }

  const pubClient = new Redis(REDIS_URL);
  const subClient = pubClient.duplicate();

  pubClient.on("error", (err) => console.error("[redis pub]", err));
  subClient.on("error", (err) => console.error("[redis sub]", err));

  io.adapter(createAdapter(pubClient, subClient));
  console.log("Redis adapter attached");
}

// /session namespace — will handle live session events in M3
const session = io.of("/session");

session.on("connection", (socket) => {
  console.log(`[session] connected  ${socket.id}`);

  socket.on("disconnect", (reason) => {
    console.log(`[session] disconnected ${socket.id} (${reason})`);
  });
});

attachRedisAdapter();

httpServer.listen(PORT, () => {
  console.log(`OmniLab realtime server listening on :${PORT}`);
});
