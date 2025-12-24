/* eslint-disable import/no-unresolved */
// @ts-nocheck - Deno Edge Function with external imports
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { Hono } from "https://deno.land/x/hono@v4.0.0/mod.ts";
import { cors } from "https://deno.land/x/hono@v4.0.0/middleware.ts";
import { trpcServer } from "npm:@hono/trpc-server@0.3.2";
import { initTRPC } from "npm:@trpc/server@10.45.0";
import superjson from "npm:superjson@2.2.1";
import { z } from "npm:zod@3.22.4";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const supabaseUrl = Deno.env.get("EXPO_PUBLIC_SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const t = initTRPC.create({
  transformer: superjson,
});

const router = t.router;
const publicProcedure = t.procedure;

const db = {
  async getUserByEmail(email: string) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return data;
  },

  async createUser(user: any) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert([{
        id: user.id,
        email: user.email,
        name: user.name,
        date_of_birth: user.dateOfBirth,
        age: user.age,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      console.error('[DB] Create user error:', error);
      throw error;
    }

    return data;
  },

  async getProfile(userId: string) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return data;
  },

  async createProfile(profile: any) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .insert([profile])
      .select()
      .single();

    if (error) {
      console.error('[DB] Create profile error:', error);
      throw error;
    }

    return data;
  },
};

const serverAuth = {
  async signUp(email: string, password: string) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    
    if (error) {
      console.error('[ServerAuth] SignUp error:', error);
      throw new Error(error.message);
    }
    
    return { user: data.user };
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('[ServerAuth] SignIn error:', error);
      throw new Error(error.message);
    }
    
    return { user: data.user, session: data.session };
  },
};

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  dateOfBirth: z.string().transform((str: string) => new Date(str)),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const createProfileSchema = z.object({
  userId: z.string(),
  bio: z.string().optional(),
  interests: z.array(z.string()).optional(),
  profilePicture: z.string().url().optional(),
});

const exampleRouter = router({
  hi: publicProcedure.query(() => {
    return { message: "Hello from Supabase Edge Function!" };
  }),
});

const authRouter = router({
  signup: publicProcedure
    .input(signupSchema)
    .mutation(async ({ input }: any) => {
      console.log('[Signup] Attempt for:', input.email);

      const birthDate = new Date(input.dateOfBirth);
      const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

      if (age < 18) {
        throw new Error('You must be at least 18 years old to create an account');
      }

      const existingUser = await db.getUserByEmail(input.email);
      if (existingUser) {
        throw new Error('An account with this email already exists');
      }

      console.log('[Signup] Creating auth user...');
      const { user: authUser } = await serverAuth.signUp(input.email, input.password);

      if (!authUser) {
        throw new Error('Failed to create authentication account');
      }

      console.log('[Signup] Auth user created:', authUser.id);

      const createdUser = await db.createUser({
        id: authUser.id,
        email: input.email,
        name: input.name,
        dateOfBirth: birthDate,
        age,
      });

      console.log('[Signup] User profile created:', createdUser.id);

      return {
        user: createdUser,
        message: 'Account created successfully',
      };
    }),

  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input }: any) => {
      console.log('[Login] Attempt for:', input.email);

      const { user, session } = await serverAuth.signIn(input.email, input.password);

      if (!user || !session) {
        throw new Error('Invalid credentials');
      }

      const userRecord = await db.getUserByEmail(input.email);
      
      if (!userRecord) {
        throw new Error('User record not found');
      }

      console.log('[Login] Success for:', input.email);

      return {
        user: userRecord,
        session,
        message: 'Login successful',
      };
    }),

  logout: publicProcedure.mutation(async () => {
    return { message: 'Logout successful' };
  }),

  requestReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }: any) => {
      return { message: 'Password reset email sent' };
    }),

  confirmReset: publicProcedure
    .input(z.object({
      token: z.string(),
      password: z.string().min(8),
    }))
    .mutation(async ({ input }: any) => {
      return { message: 'Password reset successful' };
    }),
});

const profileRouter = router({
  create: publicProcedure
    .input(createProfileSchema)
    .mutation(async ({ input }: any) => {
      const profile = await db.createProfile({
        user_id: input.userId,
        bio: input.bio || '',
        interests: input.interests || [],
        profile_picture: input.profilePicture || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      return profile;
    }),

  update: publicProcedure
    .input(createProfileSchema)
    .mutation(async ({ input }: any) => {
      return { message: 'Profile updated' };
    }),

  get: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }: any) => {
      const profile = await db.getProfile(input.userId);
      return profile;
    }),
});

const appRouter = router({
  example: exampleRouter,
  auth: authRouter,
  profile: profileRouter,
  events: router({
    create: publicProcedure.mutation(() => ({ message: 'Not implemented' })),
    update: publicProcedure.mutation(() => ({ message: 'Not implemented' })),
    delete: publicProcedure.mutation(() => ({ message: 'Not implemented' })),
    list: publicProcedure.query(() => ({ events: [] })),
    get: publicProcedure.query(() => ({ event: null })),
  }),
  favorites: router({
    add: publicProcedure.mutation(() => ({ message: 'Not implemented' })),
    remove: publicProcedure.mutation(() => ({ message: 'Not implemented' })),
    list: publicProcedure.query(() => ({ favorites: [] })),
  }),
  messages: router({
    send: publicProcedure.mutation(() => ({ message: 'Not implemented' })),
    list: publicProcedure.query(() => ({ messages: [] })),
    conversations: publicProcedure.query(() => ({ conversations: [] })),
    markRead: publicProcedure.mutation(() => ({ message: 'Not implemented' })),
  }),
  ratings: router({
    create: publicProcedure.mutation(() => ({ message: 'Not implemented' })),
    getStats: publicProcedure.query(() => ({ stats: null })),
    list: publicProcedure.query(() => ({ ratings: [] })),
  }),
  blocking: router({
    block: publicProcedure.mutation(() => ({ message: 'Not implemented' })),
    unblock: publicProcedure.mutation(() => ({ message: 'Not implemented' })),
    report: publicProcedure.mutation(() => ({ message: 'Not implemented' })),
  }),
  notifications: router({
    list: publicProcedure.query(() => ({ notifications: [] })),
    markRead: publicProcedure.mutation(() => ({ message: 'Not implemented' })),
    markAllRead: publicProcedure.mutation(() => ({ message: 'Not implemented' })),
    registerToken: publicProcedure.mutation(() => ({ message: 'Not implemented' })),
    getSettings: publicProcedure.query(() => ({ settings: null })),
    updateSettings: publicProcedure.mutation(() => ({ message: 'Not implemented' })),
  }),
  verification: router({
    request: publicProcedure.mutation(() => ({ message: 'Not implemented' })),
    status: publicProcedure.query(() => ({ status: null })),
  }),
  safety: router({
    addSafety: publicProcedure.mutation(() => ({ message: 'Not implemented' })),
    checkIn: publicProcedure.mutation(() => ({ message: 'Not implemented' })),
    checkOut: publicProcedure.mutation(() => ({ message: 'Not implemented' })),
  }),
  attendees: router({
    join: publicProcedure.mutation(() => ({ message: 'Not implemented' })),
    list: publicProcedure.query(() => ({ attendees: [] })),
  }),
  analytics: router({
    eventAnalytics: publicProcedure.query(() => ({ analytics: null })),
  }),
});

export type AppRouter = typeof appRouter;

const app = new Hono();

app.use("*", cors({
  origin: "*",
  allowHeaders: ["authorization", "x-client-info", "apikey", "content-type"],
  allowMethods: ["POST", "GET", "OPTIONS"],
}));

app.get("/", (c: any) => {
  return c.json({ 
    status: "ok", 
    message: "tRPC backend running on Supabase Edge Functions",
    timestamp: new Date().toISOString()
  });
});

app.get("/api", (c: any) => {
  return c.json({ status: "ok", message: "API is running" });
});

app.post("/signup", async (c: any) => {
  try {
    const body = await c.req.json();
    const { email, password, name, dateOfBirth } = body;

    if (!email || !password || !name || !dateOfBirth) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    const birthDate = new Date(dateOfBirth);
    const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

    if (age < 18) {
      return c.json({ success: false, error: 'You must be at least 18 years old' }, 400);
    }

    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return c.json({ success: false, error: 'Email already registered' }, 400);
    }

    const { user: authUser } = await serverAuth.signUp(email, password);

    if (!authUser) {
      return c.json({ success: false, error: 'Failed to create account' }, 500);
    }

    const createdUser = await db.createUser({
      id: authUser.id,
      email,
      name,
      dateOfBirth: birthDate,
      age,
    });

    console.log('[Signup] Success:', createdUser.id);

    return c.json({
      success: true,
      user: {
        id: createdUser.id,
        email: createdUser.email,
        name: createdUser.name,
      },
    });
  } catch (error) {
    console.error('[Signup] Error:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Signup failed' 
    }, 500);
  }
});

app.use(
  "/api/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: async () => {
      return {
        supabase: supabaseAdmin,
      };
    },
  })
);

serve(async (req: Request) => {
  const url = new URL(req.url);
  console.log("[Edge Function] Request:", req.method, url.pathname);
  
  try {
    const response = await app.fetch(req);
    console.log("[Edge Function] Response status:", response.status);
    
    const contentType = response.headers.get("content-type");
    console.log("[Edge Function] Content-Type:", contentType);
    
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
