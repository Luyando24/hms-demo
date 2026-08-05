import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { Webhook } from "svix";

interface ResendWebhookEvent {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
  };
}

const STATUS_RANK: Record<string, number> = {
  queued: 0,
  sent: 1,
  delivery_delayed: 2,
  delivered: 3,
  suppressed: 4,
  bounced: 4,
  complained: 4,
  failed: 4,
};

export default {
  fetch: withSupabase({ auth: "none" }, async (request, ctx) => {
    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed." }, { status: 405 });
    }

    const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");
    if (!webhookSecret) {
      return Response.json(
        { error: "Resend webhook verification is not configured." },
        { status: 503 },
      );
    }

    const payload = await request.text();
    const eventId = request.headers.get("svix-id") ?? "";
    const timestamp = request.headers.get("svix-timestamp") ?? "";
    const signature = request.headers.get("svix-signature") ?? "";
    if (!eventId || !timestamp || !signature) {
      return Response.json({ error: "Missing webhook signature." }, { status: 400 });
    }

    let event: ResendWebhookEvent;
    try {
      event = new Webhook(webhookSecret).verify(payload, {
        "svix-id": eventId,
        "svix-timestamp": timestamp,
        "svix-signature": signature,
      }) as ResendWebhookEvent;
    } catch {
      return Response.json({ error: "Invalid webhook signature." }, { status: 400 });
    }

    const providerMessageId = event.data?.email_id;
    if (!providerMessageId || !event.type.startsWith("email.")) {
      return Response.json({ received: true, ignored: true });
    }

    const admin = ctx.supabaseAdmin;
    const { data: priorEvent, error: priorEventError } = await admin
      .from("email_webhook_events")
      .select("event_id")
      .eq("event_id", eventId)
      .maybeSingle();
    if (priorEventError) {
      return Response.json({ error: priorEventError.message }, { status: 500 });
    }
    if (priorEvent) return Response.json({ received: true, duplicate: true });

    const { error: eventError } = await admin
      .from("email_webhook_events")
      .insert({
        event_id: eventId,
        provider_message_id: providerMessageId,
        event_type: event.type,
        event_created_at: event.created_at ?? null,
      });
    if (eventError) {
      return Response.json({ error: eventError.message }, { status: 500 });
    }

    const nextStatus = event.type.replace("email.", "");
    if (!(nextStatus in STATUS_RANK)) {
      return Response.json({ received: true, tracked: true });
    }

    const { data: delivery } = await admin
      .from("email_deliveries")
      .select("id, status")
      .eq("provider_message_id", providerMessageId)
      .maybeSingle();
    if (!delivery) {
      return Response.json({ received: true, unmatched: true });
    }

    const currentRank = STATUS_RANK[delivery.status] ?? 0;
    const nextRank = STATUS_RANK[nextStatus] ?? 0;
    if (nextRank >= currentRank) {
      const { error: updateError } = await admin
        .from("email_deliveries")
        .update({
          status: nextStatus,
          delivered_at: nextStatus === "delivered"
            ? event.created_at ?? new Date().toISOString()
            : undefined,
          last_error: ["failed", "bounced", "suppressed", "complained"].includes(nextStatus)
            ? `Resend reported ${nextStatus}.`
            : null,
        })
        .eq("id", delivery.id);
      if (updateError) {
        return Response.json({ error: updateError.message }, { status: 500 });
      }
    }

    return Response.json({ received: true });
  }),
};
