import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const VALID_ROLES = ["admin", "manager", "lab_worker", "production_worker", "harvest_worker", "viewer"];

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Not authenticated" }, 401);

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Not authenticated" }, 401);
    const callerId = userData.user.id;

    const { data: callerProfile } = await admin
      .from("profiles")
      .select("role, is_active")
      .eq("id", callerId)
      .maybeSingle();

    if (!callerProfile || callerProfile.role !== "admin" || !callerProfile.is_active) {
      return json({ error: "Admin access required" }, 403);
    }

    const body = await req.json();
    const action = body?.action;

    if (action === "create") {
      const { email, password, full_name, role, department } = body;
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return json({ error: "A valid email is required" }, 400);
      }
      if (!password || typeof password !== "string" || password.length < 6) {
        return json({ error: "Password must be at least 6 characters" }, 400);
      }
      if (!full_name || typeof full_name !== "string" || !full_name.trim()) {
        return json({ error: "Full name is required" }, 400);
      }
      if (!VALID_ROLES.includes(role)) {
        return json({ error: "Invalid role" }, 400);
      }

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: email.trim(),
        password,
        email_confirm: true,
      });
      if (createError || !created.user) {
        const msg = createError?.message ?? "Failed to create user";
        const status = /already|registered|exists/i.test(msg) ? 409 : 400;
        return json({ error: status === 409 ? "A user with this email already exists" : msg }, status);
      }

      const { error: profileError } = await admin.from("profiles").insert({
        id: created.user.id,
        full_name: full_name.trim(),
        role,
        department: department || null,
        is_active: true,
      });
      if (profileError) {
        await admin.auth.admin.deleteUser(created.user.id);
        return json({ error: "Failed to create user profile" }, 500);
      }

      return json({ success: true, user_id: created.user.id }, 200);
    }

    if (action === "delete") {
      const { user_id } = body;
      if (!user_id || typeof user_id !== "string") {
        return json({ error: "user_id is required" }, 400);
      }
      if (user_id === callerId) {
        return json({ error: "You cannot delete your own account" }, 400);
      }

      const { error: deleteError } = await admin.auth.admin.deleteUser(user_id);
      if (deleteError) {
        return json({ error: deleteError.message }, 400);
      }
      await admin.from("profiles").delete().eq("id", user_id);

      return json({ success: true }, 200);
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});
