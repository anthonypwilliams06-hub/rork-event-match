// @deno-types="npm:@types/node"
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { Hono } from "https://deno.land/x/hono@v4.0.0/mod.ts";
import { cors } from "https://deno.land/x/hono@v4.0.0/middleware.ts";
import { trpcServer } from "npm:@hono/trpc-server@0.3.2";
import { initTRPC } from "npm:@trpc/server@10.45.0";
import superjson from "npm:superjson@2.2.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const t = initTRPC.create({
  transformer: superjson,
});

const router = t.router;
const publicProcedure = t.procedure;

const exampleRouter = router({
  hi: publicProcedure.query(() => {
    return { message: "Hello from Supabase Edge Function!" };
  }),
});

const appRouter = router({
  example: exampleRouter,
});

type AppRouter = typeof appRouter;

const app = new Hono();

app.use("*", cors());

app.get("/", (c) => {
  return c.json({ 
    status: "ok", 
    message: "tRPC backend running on Supabase Edge Functions",
    timestamp: new Date().toISOString()
  });
});

app.get("/api", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

app.use(
  "/api/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: async (opts: any) => {
      const supabaseUrl = Deno.env.get("EXPO_PUBLIC_SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      
      return {
        req: opts.req,
        supabase: createClient(supabaseUrl, supabaseKey),
      };
    },
  })
);

serve(async (req: Request) => {
  console.log("[Edge Function] Request:", req.method, new URL(req.url).pathname);
  
  try {
    const response = await app.fetch(req);
    console.log("[Edge Function] Response status:", response.status);
    return response;
  } catch (error) {
    console.error("[Edge Function] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
