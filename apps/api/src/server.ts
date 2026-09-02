/**
 * Fastify HTTP server hosting the SpecLoop tRPC API.
 *
 * - `/trpc/*`   → tRPC procedures (mounted via `@trpc/server/adapters/fastify`).
 * - `/healthz`  → plain JSON health endpoint for Docker Compose health checks.
 *
 * CORS is enabled in development so the Next.js dev server (default
 * `http://localhost:3000`) can call the API. In production the web app is
 * expected to be served from the same origin or behind a reverse proxy that
 * handles CORS.
 */

import {
  type FastifyTRPCPluginOptions,
  fastifyTRPCPlugin,
} from "@trpc/server/adapters/fastify";
import Fastify from "fastify";
import { bootstrapPersistence, closePool } from "./db/hydrate.js";
import { env } from "./env.js";
import { type AppRouter, appRouter } from "./routers/index.js";
import { createContext } from "./trpc/context.js";

const PORT = env.API_PORT;
const HOST = env.API_HOST;
const WEB_ORIGIN = env.WEB_ORIGIN;

async function main() {
  await bootstrapPersistence();

  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
    // Batched tRPC GET requests join procedure names into a single `:path`
    // param (e.g. `/trpc/projects.byId,decomposition.byProject,...`), which
    // exceeds Fastify's 200-char default.
    maxParamLength: 1000,
  });

  await app.register(await import("@fastify/cors").then((m) => m.default), {
    origin: [WEB_ORIGIN],
    credentials: true,
  });

  await app.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: {
      router: appRouter,
      createContext,
      onError({ path, error }) {
        app.log.error({ err: error, path }, "tRPC procedure failed");
      },
    } satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"],
  });

  app.get("/healthz", async () => ({
    status: "ok",
    service: "specloop-api",
    timestamp: new Date().toISOString(),
  }));

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`SpecLoop API listening on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  const shutdown = async () => {
    await app.close();
    await closePool();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

void main();
