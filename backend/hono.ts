import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

const app = new Hono();

app.use("*", cors());

app.use(
  "/api/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
  })
);

app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

app.get("/api", (c) => {
  return c.json({ status: "ok", message: "API is running", timestamp: new Date().toISOString() });
});

export default app;
// Add this to your existing hono.ts file

import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

// Enable CORS
app.use('*', cors());

// Health check endpoint
app.get('/', (c) => {
  return c.json({ status: 'ok', message: 'API is running' });
});

// Auth signup endpoint (THIS IS WHAT YOU'RE MISSING)
app.post('/api/trpc/auth.signup', async (c) => {
  try {
    const body = await c.req.json();
    
    // Extract user data
    const { email, password, name, dateOfBirth } = body;
    
    // TODO: Add your database logic here
    // For now, just return success
    return c.json({
      status: 'ok',
      data: {
        id: '1',
        email: email,
        name: name,
        dateOfBirth: dateOfBirth,
      },
    }, 200);
    
  } catch (error) {
    return c.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Signup failed',
    }, 500);
  }
});

export default app;
