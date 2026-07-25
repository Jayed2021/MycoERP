import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DEMO_EMAIL = "demo@mycoerp.local";
const DEMO_PASSWORD = "DemoFarm2026!";
const DEMO_FULL_NAME = "Demo Manager";

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

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    // POST { action: "login" } -> returns demo credentials if demo_mode enabled
    if (action === "login") {
      // Server-side gate: only hand out credentials while demo_mode is enabled.
      const { data: setting } = await admin
        .from("app_settings")
        .select("value")
        .eq("key", "demo_mode")
        .maybeSingle();

      const enabled = (setting?.value as { enabled?: boolean } | null)?.enabled === true;
      if (!enabled) {
        return json({ error: "Demo mode is disabled." }, 403);
      }

      // Find the existing demo auth user by email.
      const { data: list, error: listError } = await admin.auth.admin.listUsers();
      if (listError) return json({ error: "Could not verify demo account." }, 500);

      const existing = list.users.find((u) => u.email === DEMO_EMAIL);

      if (existing) {
        // Ensure the profile is active with the demo role and a known password.
        await admin
          .from("profiles")
          .update({ is_active: true, role: "demo", full_name: DEMO_FULL_NAME })
          .eq("id", existing.id);
        await admin.auth.admin.updateUserById(existing.id, { password: DEMO_PASSWORD });
      } else {
        // Create the demo auth user + profile.
        const { data: created, error: createError } = await admin.auth.admin.createUser({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
          email_confirm: true,
        });
        if (createError || !created.user) {
          return json({ error: "Could not create demo account." }, 500);
        }
        await admin.from("profiles").insert({
          id: created.user.id,
          full_name: DEMO_FULL_NAME,
          role: "demo",
          department: "Management",
          is_active: true,
        });
      }

      return json({ email: DEMO_EMAIL, password: DEMO_PASSWORD }, 200);
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});
