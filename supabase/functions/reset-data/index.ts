import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    // Verify caller is an active admin.
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

    // Delete every non-admin user account (auth + profile) so demo/test
    // logins are removed while the caller and any other admins are preserved.
    const { data: nonAdminProfiles } = await admin
      .from("profiles")
      .select("id")
      .neq("role", "admin");

    const toDelete = (nonAdminProfiles ?? [])
      .map((p: { id: string }) => p.id)
      .filter((id: string) => id !== callerId);

    for (const id of toDelete) {
      await admin.auth.admin.deleteUser(id);
    }
    // Remove orphaned profile rows (in case auth delete already cascaded).
    if (toDelete.length > 0) {
      await admin.from("profiles").delete().in("id", toDelete);
    }

    // Wipe all operational data; preserves the foundational catalog and
    // restores the seeded inventory items. SECURITY DEFINER function.
    const { error: resetError } = await admin.rpc("reset_app_data");
    if (resetError) {
      return json({ error: "Reset failed: " + resetError.message }, 500);
    }

    // Turn off demo mode as part of going to production.
    await admin
      .from("app_settings")
      .update({ value: { enabled: false }, updated_at: new Date().toISOString() })
      .eq("key", "demo_mode");

    return json({ success: true, deleted_users: toDelete.length }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return json({ error: message }, 500);
  }
});
