// Stripe → Supabase purchases sync — v3
// Source of truth: workers/stripe-webhook/worker.js in the site repo.
// Deployed separately in the Cloudflare dashboard (not part of the site build).
//
// v3 vs v2:
//  - Live Lab Classes memberships are tracked in `class_memberships` (Supabase):
//    status, paid period and end date, kept up to date from
//    customer.subscription.updated / customer.subscription.deleted. Class access
//    (has_live_classes_access in Supabase) is based on this, not on "ever bought".
//    A one-time annual payment counts as paid for 1 year from the payment.
//  - Live Lab Classes purchases are written as course_id 'live-lab-classes' (the id
//    the dashboard and join_class use); v2 wrote 'live-labs-monthly' / '-yearly'.
//  - The buyer's account is looked up by exact email (user_id_for_email in Supabase).
//    v2 called /auth/v1/admin/users?email=…, which has no email filter, so users[0]
//    was simply the first account in the list.
//  - Signature check: missing header → 400 (v2 threw), 5-minute timestamp tolerance,
//    constant-time comparison, any of several v1 signatures accepted.
//  - Supabase write failures return 500, so Stripe retries the event.
//
// v2 notes: Live Lab Classes participant capture via Stripe's native custom
// checkout fields (Full Name — email comes from Stripe's customer_details),
// written to the `participants` table. Remaining profile info is collected later
// in the normal signup/onboarding flow, not at checkout.
//
// Price IDs in LIVE_LAB_TIER_PRICES have been confirmed against the live
// Stripe Dashboard (Founding €59/mo, Annual €499/yr). 'standard' has no
// live Payment Link yet — add its price_... id once it exists.
//
// Environment variables needed (same as before):
// STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY
//
// Stripe webhook events this endpoint must receive:
// checkout.session.completed, customer.subscription.updated, customer.subscription.deleted

const PRICE_TO_COURSE = {
  'price_1TggzlCzMFNh06fG00cN0NGK': 'movement',
  'price_1Tgh21CzMFNh06fGFohUgMWf': 'sculpt',
  'price_1Tgh2ZCzMFNh06fGuC0uglF1': 'strength',
  'price_1Tgh3MCzMFNh06fGMtaFifi8': 'metabolic',
  'price_1TghDGCzMFNh06fGU4EKPKSB': 'live-lab-classes',
  'price_1TghDhCzMFNh06fGro7Jctb8': 'live-lab-classes',
  'price_1TnF1sCzMFNh06fGkTCQXCkR': 'inperson-single',
  'price_1TghKeCzMFNh06fGR3Xmir8s': 'inperson-10pack',
  'price_1TnFCeCzMFNh06fGcff2Ha74': 'online-single',
  'price_1TnFdzCzMFNh06fGvpH3Zv9g': 'online-8pack',
};

// Verified against the live Stripe Dashboard.
const LIVE_LAB_TIER_PRICES = {
  'price_1TghDGCzMFNh06fGU4EKPKSB': 'founding',  // €59/mo
  'price_1TghDhCzMFNh06fGro7Jctb8': 'annual',    // €499/yr
  // 'standard' has no live Payment Link yet — add its price_... id here once it exists.
};

const SIGNATURE_TOLERANCE_SEC = 300;

async function verifyStripeSignature(payload, signature, secret) {
  if (!signature || !secret) return false;
  const parts = signature.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.slice(2);
  const signatures = parts.filter(p => p.startsWith('v1=')).map(p => p.slice(3));
  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > SIGNATURE_TOLERANCE_SEC) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${payload}`));
  const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

  return signatures.some(v1 => timingSafeEqual(computed, v1));
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Extracts the participant's name from Stripe Checkout Session
// custom_fields — matches by field TYPE (first 'text' field), so it
// doesn't depend on the exact label wording configured in the Dashboard.
function extractParticipantInfo(customFields) {
  if (!Array.isArray(customFields)) return { name: null };
  const nameField = customFields.find(f => f.type === 'text' && f.text?.value);
  return { name: nameField ? nameField.text.value : null };
}

// ── Stripe + Supabase helpers ─────────────────────────────────────────
async function stripeGet(env, path) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` },
  });
  if (!res.ok) throw new Error(`Stripe GET ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

function supabaseHeaders(env, extra = {}) {
  return {
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    'apikey': env.SUPABASE_SERVICE_KEY,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function supabaseRpc(env, fn, args) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: supabaseHeaders(env),
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`Supabase rpc ${fn} failed: ${res.status} ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const toIso = unixSeconds => (unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null);

// Which Live Lab Classes plan a subscription is for, or null if it isn't one
function liveLabPlan(subscription) {
  for (const item of subscription.items?.data || []) {
    const plan = LIVE_LAB_TIER_PRICES[item.price?.id];
    if (plan) return plan;
  }
  return null;
}

// Newer Stripe API versions keep the billing period on the subscription item
function subscriptionPeriod(subscription) {
  const item = subscription.items?.data?.[0] || {};
  return {
    start: subscription.current_period_start ?? item.current_period_start,
    end: subscription.current_period_end ?? item.current_period_end,
  };
}

// Writes the membership state. Supabase ignores events older than the stored one,
// so out-of-order deliveries can't undo a cancellation.
async function saveSubscriptionMembership(env, subscription, eventCreated, emailHint) {
  const plan = liveLabPlan(subscription);
  if (!plan) return false;
  let email = emailHint || null;
  if (!email && subscription.customer) {
    const customer = await stripeGet(env, `customers/${subscription.customer}`);
    email = customer.email || null;
  }
  const period = subscriptionPeriod(subscription);
  await supabaseRpc(env, 'upsert_class_membership', {
    p: {
      stripe_ref: subscription.id,
      stripe_customer_id: subscription.customer || null,
      email,
      plan,
      status: subscription.status,
      current_period_start: toIso(period.start),
      current_period_end: toIso(period.end),
      cancel_at_period_end: !!subscription.cancel_at_period_end,
      ended_at: toIso(subscription.ended_at),
      event_at: toIso(eventCreated),
    },
  });
  console.log(`Membership ${subscription.id} (${plan}) → ${subscription.status}, paid until ${toIso(period.end)}`);
  return true;
}

// ── Event handlers ────────────────────────────────────────────────────
async function handleCheckoutCompleted(env, event) {
  const session = event.data.object;
  const customerEmail = session.customer_details?.email;

  if (!customerEmail) {
    return new Response('No email', { status: 200 });
  }

  const lineItems = await stripeGet(env, `checkout/sessions/${session.id}/line_items`);

  const courseIds = [];
  let participantTier = null;

  for (const item of lineItems.data || []) {
    const priceId = item.price?.id;
    if (priceId && PRICE_TO_COURSE[priceId] && !courseIds.includes(PRICE_TO_COURSE[priceId])) {
      courseIds.push(PRICE_TO_COURSE[priceId]);
    }
    if (priceId && LIVE_LAB_TIER_PRICES[priceId]) {
      participantTier = LIVE_LAB_TIER_PRICES[priceId];
    }
  }

  if (participantTier) {
    // ── Live Lab Classes membership (access to classes) ──────────────
    // Stored by email, so it counts even if the buyer creates their account later.
    if (session.mode === 'subscription' && session.subscription) {
      const subscription = await stripeGet(env, `subscriptions/${session.subscription}`);
      await saveSubscriptionMembership(env, subscription, event.created, customerEmail);
    } else {
      // One-time payment (e.g. annual): paid for one year from the payment
      const paidAt = new Date(event.created * 1000);
      const paidUntil = new Date(paidAt);
      paidUntil.setFullYear(paidUntil.getFullYear() + 1);
      await supabaseRpc(env, 'upsert_class_membership', {
        p: {
          stripe_ref: session.id,
          stripe_customer_id: session.customer || null,
          email: customerEmail,
          plan: participantTier,
          status: 'paid',
          current_period_start: paidAt.toISOString(),
          current_period_end: paidUntil.toISOString(),
          cancel_at_period_end: true,
          ended_at: null,
          event_at: paidAt.toISOString(),
        },
      });
      console.log(`Membership ${session.id} (${participantTier}) paid until ${paidUntil.toISOString()}`);
    }

    // ── Live Lab Classes participant capture ──────────────────────────
    const { name } = extractParticipantInfo(session.custom_fields);
    const participantRes = await fetch(`${env.SUPABASE_URL}/rest/v1/participants`, {
      method: 'POST',
      headers: supabaseHeaders(env, { 'Prefer': 'resolution=ignore-duplicates' }), // Stripe retries: one row per checkout
      body: JSON.stringify({
        full_name: name,
        email: customerEmail,
        class_tier: participantTier,
        stripe_session_id: session.id,
      }),
    });
    if (!participantRes.ok) {
      console.error('Participant insert error:', await participantRes.text());
    } else {
      console.log(`✅ Participant captured for ${participantTier}: ${customerEmail}`);
    }
  }

  // ── Course-purchase sync ──────────────────────────────────────────
  if (courseIds.length === 0) {
    return new Response('No matching courses', { status: 200 });
  }

  const userId = await supabaseRpc(env, 'user_id_for_email', { p_email: customerEmail });

  if (!userId) {
    // Class access still works through class_memberships (matched by email)
    console.log(`No Supabase user found for email: ${customerEmail}`);
    return new Response('User not found', { status: 200 });
  }

  const purchases = courseIds.map(courseId => ({
    user_id: userId,
    course_id: courseId,
    created_at: new Date().toISOString(),
  }));

  const insertRes = await fetch(`${env.SUPABASE_URL}/rest/v1/purchases`, {
    method: 'POST',
    headers: supabaseHeaders(env, { 'Prefer': 'resolution=ignore-duplicates' }),
    body: JSON.stringify(purchases),
  });

  if (!insertRes.ok) {
    const err = await insertRes.text();
    console.error('Supabase insert error:', err);
    return new Response('DB error', { status: 500 });
  }

  console.log(`✅ ${courseIds.join(', ')} added for ${customerEmail}`);
  return new Response('OK', { status: 200 });
}

// customer.subscription.updated / .deleted: renewals, payment problems,
// "cancel at period end", and the final end of a subscription
async function handleSubscriptionChange(env, event) {
  const saved = await saveSubscriptionMembership(env, event.data.object, event.created, null);
  return new Response(saved ? 'OK' : 'Not a Live Lab Classes subscription', { status: 200 });
}

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('OK', { status: 200 });
    }

    const payload = await request.text();
    const signature = request.headers.get('stripe-signature');

    const valid = await verifyStripeSignature(payload, signature, env.STRIPE_WEBHOOK_SECRET);
    if (!valid) {
      return new Response('Invalid signature', { status: 400 });
    }

    const event = JSON.parse(payload);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          return await handleCheckoutCompleted(env, event);
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          return await handleSubscriptionChange(env, event);
        default:
          return new Response('OK', { status: 200 });
      }
    } catch (err) {
      // 500 makes Stripe retry the event later
      console.error(`Error handling ${event.type} (${event.id}):`, err);
      return new Response('Error', { status: 500 });
    }
  }
};
