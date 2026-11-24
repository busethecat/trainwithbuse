// Supabase keep-alive — deployed as its own Worker ("supabase-keepalive"),
// NOT part of the site build. Runs on a Cron Trigger every 2 days.
//
// Free Supabase projects pause after 7 days without activity. One tiny read
// keeps the project awake. It uses the public anon key (the same one as
// config.js): RLS hides every row from anon, so the response is an empty list,
// but the request still runs a real Postgres query, which is what counts as
// activity. No service-role key and no RLS change needed.

const SUPABASE_URL = 'https://jgrnqqvmxqvfbxgvxuom.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xNmBmtMoxeeYsrtohlookw_yadawA3q';
const TABLE = 'deletion_requests'; // any table works; this one is small

async function ping() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?select=id&limit=1`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase ping failed: ${res.status} ${await res.text()}`);
  return res.status;
}

export default {
  // Cron Trigger: a thrown error marks the run as failed in the Worker's logs
  async scheduled(event, env, ctx) {
    const status = await ping();
    console.log('Supabase ping OK', status, event.cron);
  },

  // Opening the Worker URL runs the same ping, for a manual test after deploying
  async fetch() {
    try {
      return new Response('Supabase ping OK (' + (await ping()) + ')');
    } catch (err) {
      return new Response(String(err), { status: 502 });
    }
  },
};
