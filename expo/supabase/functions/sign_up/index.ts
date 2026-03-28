/* eslint-disable import/no-unresolved */
// @ts-nocheck - Deno Edge Function
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

type SignupInput = {
  email?: string;
  password?: string;
  name?: string;
  dateOfBirth?: string;
};

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("EXPO_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase env vars. Set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Edge Function secrets."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, password, name, dateOfBirth }: SignupInput = await req.json();

    if (!email || !password || !name || !dateOfBirth) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const birthDate = new Date(dateOfBirth);
    const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (Number.isNaN(birthDate.getTime())) {
      return new Response(JSON.stringify({ error: "Invalid dateOfBirth" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (age < 18) {
      return new Response(JSON.stringify({ error: "You must be at least 18" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getSupabaseClient();

    const { data: existingUser, error: existingError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingError) {
      console.error("[sign_up] Error checking existing user:", existingError.message);
      return new Response(JSON.stringify({ error: existingError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existingUser) {
      console.log("[sign_up] ❌ Duplicate account attempt:", { email });
      return new Response(JSON.stringify({ error: "An account with this email already exists" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[sign_up] ✓ Creating new account:", { email });

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
      },
    });

    if (authError || !authData?.user) {
      const message = authError?.message ?? "Auth creation failed";
      console.error("[sign_up] ❌ Auth error:", message, { email });
      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authUserId = authData.user.id;
    console.log("[sign_up] ✅ Auth user created:", { userId: authUserId });

    const { data: existingIdRow, error: existingIdError } = await supabase
      .from("users")
      .select("id")
      .eq("id", authUserId)
      .maybeSingle();

    if (existingIdError) {
      console.error("[sign_up] Error checking user by id:", existingIdError.message);
      return new Response(JSON.stringify({ error: existingIdError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!existingIdRow) {
      const { error: insertError } = await supabase.from("users").insert({
        id: authUserId,
        email,
        name,
        date_of_birth: birthDate.toISOString(),
        age,
      });

      if (insertError) {
        console.error("[sign_up] ❌ User table insert error:", insertError.message, { userId: authUserId });
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log("[sign_up] ✅ User row created:", { userId: authUserId });
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (sessionError || !sessionData) {
      console.error("[sign_up] Session generation error:", sessionError?.message);
      return new Response(
        JSON.stringify({
          userId: authUserId,
          message: "Account created successfully, please sign in",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[sign_up] ✅ Signup complete:", { userId: authUserId, email });
    return new Response(
      JSON.stringify({
        userId: authUserId,
        message: "Account created successfully",
        session: sessionData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[sign_up] ❌ Unexpected error:", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
