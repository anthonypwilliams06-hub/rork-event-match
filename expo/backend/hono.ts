import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";

const app = new Hono();

// Enable CORS
app.use("*", cors());

// Health check
app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

app.get("/api", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

// tRPC routes
app.use(
  "/api/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: createContext,
  })
);

export default app;
