import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { device_id, api_key, temperature, humidity, co2 } = body;

    if (!device_id || !api_key) {
      return new Response(
        JSON.stringify({ error: "Missing device_id or api_key" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Hash the provided API key for comparison
    const encoder = new TextEncoder();
    const data = encoder.encode(api_key);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const apiKeyHash = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Validate device and API key
    const { data: device, error: deviceError } = await supabase
      .from("iot_devices")
      .select("*, room:rooms(id, name, temp_min, temp_max, humidity_min, humidity_max, co2_max)")
      .eq("id", device_id)
      .eq("api_key_hash", apiKeyHash)
      .eq("is_active", true)
      .maybeSingle();

    if (deviceError || !device) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: invalid device_id or api_key" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update last_seen_at
    await supabase
      .from("iot_devices")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", device_id);

    // Insert environmental log
    const logData: Record<string, unknown> = {
      room_id: device.room_id,
      device_id: device_id,
      source: "iot",
      logged_at: new Date().toISOString(),
      temperature: temperature ?? null,
      humidity: humidity ?? null,
      co2: co2 ?? null,
    };

    await supabase.from("environmental_logs").insert(logData);

    // Check thresholds and generate alerts
    const room = device.room;
    const alertsTriggered: string[] = [];

    if (room) {
      const checks: Array<{
        type: string;
        value: number | null | undefined;
        threshold: number | null;
        condition: (val: number, thresh: number) => boolean;
      }> = [
        {
          type: "temp_high",
          value: temperature,
          threshold: room.temp_max,
          condition: (v, t) => v > t,
        },
        {
          type: "temp_low",
          value: temperature,
          threshold: room.temp_min,
          condition: (v, t) => v < t,
        },
        {
          type: "humidity_high",
          value: humidity,
          threshold: room.humidity_max,
          condition: (v, t) => v > t,
        },
        {
          type: "humidity_low",
          value: humidity,
          threshold: room.humidity_min,
          condition: (v, t) => v < t,
        },
        {
          type: "co2_high",
          value: co2,
          threshold: room.co2_max,
          condition: (v, t) => v > t,
        },
      ];

      for (const check of checks) {
        if (
          check.value == null ||
          check.threshold == null ||
          !check.condition(check.value, check.threshold)
        ) {
          continue;
        }

        // Check for duplicate alert in last hour
        const oneHourAgo = new Date(
          Date.now() - 60 * 60 * 1000
        ).toISOString();
        const { data: existing } = await supabase
          .from("environmental_alerts")
          .select("id")
          .eq("room_id", device.room_id)
          .eq("alert_type", check.type)
          .is("resolved_at", null)
          .gte("created_at", oneHourAgo)
          .limit(1);

        if (existing && existing.length > 0) {
          continue;
        }

        // Format alert description
        const alertLabels: Record<string, string> = {
          temp_high: "High temperature",
          temp_low: "Low temperature",
          humidity_high: "High humidity",
          humidity_low: "Low humidity",
          co2_high: "High CO2",
        };
        const unitMap: Record<string, string> = {
          temp_high: "C",
          temp_low: "C",
          humidity_high: "%",
          humidity_low: "%",
          co2_high: "ppm",
        };
        const label = alertLabels[check.type] ?? check.type;
        const unit = unitMap[check.type] ?? "";
        const taskTitle = `Investigate: ${label} in ${room.name} (${check.value}${unit}, threshold ${check.threshold}${unit})`;

        // Create auto-task
        const dueAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
        const { data: task } = await supabase
          .from("tasks")
          .insert({
            title: taskTitle,
            description: `Automated alert: ${label} detected by IoT sensor "${device.device_name}" in ${room.name}. Measured: ${check.value}${unit}, Threshold: ${check.threshold}${unit}. Please investigate and resolve.`,
            task_type: "environmental_alert",
            assigned_role: "manager",
            due_at: dueAt,
            priority: "High",
            status: "Pending",
            photo_required: false,
            approval_required: false,
          })
          .select("id")
          .single();

        // Create alert record
        await supabase.from("environmental_alerts").insert({
          room_id: device.room_id,
          device_id: device_id,
          alert_type: check.type,
          measured_value: check.value,
          threshold_value: check.threshold,
          auto_task_id: task?.id ?? null,
        });

        // Notify all managers
        const { data: managers } = await supabase
          .from("profiles")
          .select("id")
          .in("role", ["admin", "manager"])
          .eq("is_active", true);

        if (managers && managers.length > 0) {
          const notifications = managers.map((m) => ({
            user_id: m.id,
            title: `Environmental Alert: ${label}`,
            body: `${room.name}: ${check.value}${unit} (threshold: ${check.threshold}${unit})`,
            notification_type: "environmental_alert",
            related_task_id: task?.id ?? null,
          }));
          await supabase.from("notifications").insert(notifications);
        }

        alertsTriggered.push(check.type);
      }
    }

    return new Response(
      JSON.stringify({
        status: "ok",
        device_id,
        room: room?.name ?? null,
        alerts_triggered: alertsTriggered,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
