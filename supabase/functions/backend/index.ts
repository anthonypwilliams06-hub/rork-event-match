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

      return {
        profile: {
          id: profile.id,
          user_id: profile.user_id,
          bio: profile.bio,
          interests: profile.interests,
          profile_picture: profile.profile_picture,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        },
      };
    }),

  update: publicProcedure
    .input(createProfileSchema)
    .mutation(async ({ input }: any) => {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update({
          bio: input.bio,
          interests: input.interests,
          profile_picture: input.profilePicture,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', input.userId)
        .select()
        .single();

      if (error) {
        console.error('[Profile] Update error:', error);
        throw new Error(error.message);
      }

      return {
        profile: {
          id: data.id,
          user_id: data.user_id,
          bio: data.bio,
          interests: data.interests,
          profile_picture: data.profile_picture,
          created_at: data.created_at,
          updated_at: data.updated_at,
        },
      };
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
    create: publicProcedure
      .input(z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        category: z.enum(['food_drink', 'outdoor', 'entertainment', 'sports', 'arts_culture', 'social', 'other']),
        date: z.coerce.date(),
        time: z.string(),
        location: z.string().min(1),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        imageUrl: z.string().min(1),
        capacity: z.number().min(1).optional(),
        vibes: z.array(z.enum(['chill', 'adventurous', 'romantic', 'social', 'intimate', 'energetic', 'cultural', 'fun'])).default([]),
        isDraft: z.boolean().default(false),
        isPaid: z.boolean().default(false),
        price: z.number().min(0).optional(),
        currency: z.string().default('USD').optional(),
        creatorId: z.string(),
      }))
      .mutation(async ({ input }: any) => {
        console.log('[Events] Creating event:', input.title);
        
        const eventDate = input.date instanceof Date ? input.date : new Date(input.date);
        
        const { data, error } = await supabaseAdmin
          .from('events')
          .insert([{
            creator_id: input.creatorId,
            title: input.title,
            description: input.description,
            date: eventDate.toISOString(),
            time: input.time,
            location: input.location,
            latitude: input.latitude || null,
            longitude: input.longitude || null,
            category: input.category,
            vibes: input.vibes || [],
            image_url: input.imageUrl,
            capacity: input.capacity || null,
            spots_available: input.capacity || null,
            attendee_ids: [],
            status: input.isDraft ? 'draft' : 'upcoming',
            is_draft: input.isDraft,
            is_paid: input.isPaid,
            price: input.price || null,
            currency: input.currency || 'USD',
            views: 0,
            likes: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }])
          .select()
          .single();

        if (error) {
          console.error('[Events] Create error:', error);
          throw new Error(error.message);
        }

        console.log('[Events] Event created:', data.id);
        
        return {
          id: data.id,
          creatorId: data.creator_id,
          title: data.title,
          description: data.description,
          date: new Date(data.date),
          time: data.time,
          location: data.location,
          latitude: data.latitude,
          longitude: data.longitude,
          category: data.category,
          vibes: data.vibes || [],
          imageUrl: data.image_url,
          capacity: data.capacity,
          spotsAvailable: data.spots_available,
          attendeeIds: data.attendee_ids || [],
          status: data.status,
          isDraft: data.is_draft,
          isPaid: data.is_paid,
          price: data.price,
          currency: data.currency,
          views: data.views,
          likes: data.likes,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        };
      }),
    update: publicProcedure
      .input(z.object({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        date: z.coerce.date().optional(),
        time: z.string().optional(),
        location: z.string().optional(),
        imageUrl: z.string().optional(),
      }))
      .mutation(async ({ input }: any) => {
        console.log('[Events] Updating event:', input.id);
        return { success: true, id: input.id };
      }),
    delete: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }: any) => {
        console.log('[Events] Deleting event:', input.id);
        return { success: true };
      }),
    list: publicProcedure
      .input(z.object({
        filters: z.any().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(async ({ input }: any) => {
        console.log('[Events] Listing events');
        const { data, error } = await supabaseAdmin
          .from('events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(input?.limit || 50);

        if (error) {
          console.error('[Events] List error:', error);
          return { events: [] };
        }

        return { events: data || [] };
      }),
    get: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }: any) => {
        console.log('[Events] Getting event:', input.id);
        return { event: null };
      }),
  }),
  favorites: router({
    add: publicProcedure
      .input(z.object({ eventId: z.string(), userId: z.string() }))
      .mutation(async ({ input }: any) => {
        console.log('[Favorites] Adding favorite');
        return { success: true };
      }),
    remove: publicProcedure
      .input(z.object({ eventId: z.string(), userId: z.string() }))
      .mutation(async ({ input }: any) => {
        console.log('[Favorites] Removing favorite');
        return { success: true };
      }),
    list: publicProcedure.query(() => ({ favorites: [] })),
  }),
  messages: router({
    send: publicProcedure
      .input(z.object({
        senderId: z.string(),
        recipientId: z.string(),
        content: z.string(),
      }))
      .mutation(async ({ input }: any) => {
        console.log('[Messages] Sending message');
        return { success: true };
      }),
    list: publicProcedure.query(() => ({ messages: [] })),
    conversations: publicProcedure.query(() => ({ conversations: [] })),
    markRead: publicProcedure
      .input(z.object({ messageId: z.string() }))
      .mutation(async ({ input }: any) => {
        console.log('[Messages] Marking message as read');
        return { success: true };
      }),
  }),
  ratings: router({
    create: publicProcedure
      .input(z.object({
        eventId: z.string(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      }))
      .mutation(async ({ input }: any) => {
        console.log('[Ratings] Creating rating');
        return { success: true };
      }),
    getStats: publicProcedure
      .input(z.object({ userId: z.string() }))
      .query(async ({ input }: any) => {
        console.log('[Ratings] Getting stats');
        return { stats: { average: 0, count: 0 } };
      }),
    list: publicProcedure.query(() => ({ ratings: [] })),
  }),
  blocking: router({
    block: publicProcedure
      .input(z.object({ userId: z.string(), blockedUserId: z.string() }))
      .mutation(async ({ input }: any) => {
        console.log('[Blocking] Blocking user');
        return { success: true };
      }),
    unblock: publicProcedure
      .input(z.object({ userId: z.string(), blockedUserId: z.string() }))
      .mutation(async ({ input }: any) => {
        console.log('[Blocking] Unblocking user');
        return { success: true };
      }),
    report: publicProcedure
      .input(z.object({
        reporterId: z.string(),
        reportedId: z.string(),
        reason: z.string(),
      }))
      .mutation(async ({ input }: any) => {
        console.log('[Blocking] Reporting user');
        return { success: true };
      }),
  }),
  notifications: router({
    list: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(() => []),
    markRead: publicProcedure
      .input(z.object({ notificationId: z.string() }))
      .mutation(async ({ input }: any) => {
        console.log('[Notifications] Marking as read');
        return { success: true };
      }),
    markAllRead: publicProcedure
      .input(z.object({ userId: z.string() }))
      .mutation(async ({ input }: any) => {
        console.log('[Notifications] Marking all as read');
        return { success: true };
      }),
    registerToken: publicProcedure
      .input(z.object({ userId: z.string(), token: z.string() }))
      .mutation(async ({ input }: any) => {
        console.log('[Notifications] Registering token');
        return { success: true };
      }),
    getSettings: publicProcedure
      .input(z.object({ userId: z.string() }))
      .query(async ({ input }: any) => {
        console.log('[Notifications] Getting settings');
        return { settings: null };
      }),
    updateSettings: publicProcedure
      .input(z.object({ userId: z.string(), settings: z.any() }))
      .mutation(async ({ input }: any) => {
        console.log('[Notifications] Updating settings');
        return { success: true };
      }),
  }),
  verification: router({
    request: publicProcedure
      .input(z.object({ userId: z.string() }))
      .mutation(async ({ input }: any) => {
        console.log('[Verification] Requesting verification');
        return { success: true };
      }),
    status: publicProcedure
      .input(z.object({ userId: z.string() }))
      .query(async ({ input }: any) => {
        console.log('[Verification] Getting status');
        return { status: null };
      }),
  }),
  safety: router({
    addSafety: publicProcedure
      .input(z.object({ userId: z.string(), contactName: z.string(), contactPhone: z.string() }))
      .mutation(async ({ input }: any) => {
        console.log('[Safety] Adding safety contact');
        return { success: true };
      }),
    checkIn: publicProcedure
      .input(z.object({ userId: z.string(), eventId: z.string() }))
      .mutation(async ({ input }: any) => {
        console.log('[Safety] Checking in');
        return { success: true };
      }),
    checkOut: publicProcedure
      .input(z.object({ userId: z.string(), eventId: z.string() }))
      .mutation(async ({ input }: any) => {
        console.log('[Safety] Checking out');
        return { success: true };
      }),
  }),
  attendees: router({
    join: publicProcedure
      .input(z.object({ userId: z.string(), eventId: z.string() }))
      .mutation(async ({ input }: any) => {
        console.log('[Attendees] Joining event');
        return { success: true };
      }),
    list: publicProcedure.query(() => ({ attendees: [] })),
  }),
  analytics: router({
    eventAnalytics: publicProcedure
      .input(z.object({ eventId: z.string() }))
      .query(async ({ input }: any) => {
        console.log('[Analytics] Getting event analytics');
        return { analytics: null };
      }),
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
