// Booking Notification Worker — v6
// Source of truth: workers/booking-notify/worker.js in the site repo.
// Deployed separately in the Cloudflare dashboard (not part of the site build).
//
// v6 vs v5: the intro call is 30 minutes; waitlist emails suggest group classes
// and The Lab System based on data.classesOpen / data.labOpen (from config.js's
// CLASSES_SALES_OPEN / LAB_SALES_OPEN, sent by admin.html); the applicant's
// first name starts with a capital letter.
//
// v5 vs v4: new /admin email types — session_cancelled (a confirmed session is
// cancelled), application_accepted / application_waitlist (Buse Method
// applications, in the applicant's language: en / de / tr).
//
// v4 vs v3-FIXED:
//  - Every user-submitted value is HTML-escaped before it goes into an email,
//    so form input can't inject links, buttons or markup into the inbox.
//  - CORS accepts both https://trainwithbuse.com and https://www.trainwithbuse.com.
//  - Invalid JSON gets a 400 instead of an unhandled exception.
//  - POST /admin requires a valid Supabase session for the admin account
//    (Authorization: Bearer <access token>, checked against /auth/v1/user);
//    anything else gets a 401, so nobody can send client emails through it.
//
// v3 notes:
// POST /        → Buse'ye yeni booking / application bildirimi
// POST /admin   → Müşteriye confirmed/alternative/cancelled emaili
//
// FIX vs v2: sendResend() used to swallow Resend API failures — it only
// logged to console (invisible outside Cloudflare's own dashboard) and the
// Worker always returned "OK" to the caller regardless of whether the email
// actually sent. That is why every failure has been silent on the client
// side (curl/browser always saw 200) with zero visibility into the real
// cause. Now sendResend() returns {ok, error}, and both handlers return a
// real 500 + the Resend error text when delivery fails, so the failure is
// visible to whoever is calling this Worker instead of disappearing.

// Access-Control-Allow-Origin is set per request in withCors() (echoing the
// caller's origin if it's allowed), so it is not part of CORS.
const ALLOWED_ORIGINS = ['https://trainwithbuse.com', 'https://www.trainwithbuse.com'];

const CORS = {
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Public project values (same as the site's config.js) — used only to verify admin tokens
const SUPABASE_URL = 'https://jgrnqqvmxqvfbxgvxuom.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xNmBmtMoxeeYsrtohlookw_yadawA3q';
const ADMIN_EMAIL = 'hello@trainwithbuse.com';

// True only if the request carries a live Supabase session for ADMIN_EMAIL
async function isAdminRequest(request) {
  const match = (request.headers.get('Authorization') || '').match(/^Bearer\s+(\S+)$/i);
  if (!match) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${match[1]}` },
    });
    if (!res.ok) return false;
    const user = await res.json();
    return (user.email || '').toLowerCase() === ADMIN_EMAIL;
  } catch (err) {
    console.error('Admin token check failed:', err);
    return false;
  }
}

function withCors(response, request) {
  const origin = request.headers.get('Origin');
  const res = new Response(response.body, response);
  res.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  res.headers.set('Vary', 'Origin');
  return res;
}

// Everything that came from a request goes through this before it touches email HTML
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export default {
  async fetch(request, env) {
    return withCors(await route(request, env), request);
  }
};

async function route(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS });

  const url = new URL(request.url);
  if (url.pathname === '/admin' && !(await isAdminRequest(request))) {
    return new Response('Unauthorized', { status: 401, headers: CORS });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: CORS });
  }

  if (url.pathname === '/admin') {
    return handleAdminEmail(body, env);
  }
  return handleNewBooking(body, env);
}

async function handleNewBooking({ userEmail, sessionType, slots, notes }, env) {
  const sessionLabel = sessionType === 'online' ? 'Online (Zoom)' : (sessionType || 'In-Person (Berlin)');

  const slotsHtml = (Array.isArray(slots) ? slots : []).map((s, i) => `
    <tr><td style="padding:6px 0;font-size:14px;color:#2D2A2E;">
      <strong>Option ${i+1}:</strong> ${escapeHtml(s?.date)} at ${escapeHtml(s?.time)}
    </td></tr>`).join('');

  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#F5EBE0;padding:32px 16px;">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;margin:0 auto;">
    <tr><td style="background:#2D2A2E;padding:24px 32px;">
      <div style="font-family:Georgia,serif;font-size:20px;color:#FDF6F0;letter-spacing:3px;font-weight:600;">BUSE</div>
    </td></tr>
    <tr><td style="padding:32px;">
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#C1848B;font-weight:600;margin-bottom:6px;">New Booking Request</div>
      <div style="font-family:Georgia,serif;font-size:26px;color:#2D2A2E;margin-bottom:24px;">A client wants to book a session.</div>
      <table width="100%" style="margin-bottom:16px;"><tr><td style="background:#FDF6F0;padding:12px 14px;border-radius:10px;">
        <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#4A4548;margin-bottom:3px;">Client</div>
        <div style="font-size:14px;color:#2D2A2E;font-weight:500;">${escapeHtml(userEmail)}</div>
      </td></tr></table>
      <table width="100%" style="margin-bottom:16px;"><tr><td style="background:#FDF6F0;padding:12px 14px;border-radius:10px;">
        <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#4A4548;margin-bottom:3px;">Session Type</div>
        <div style="font-size:14px;color:#2D2A2E;font-weight:500;">${escapeHtml(sessionLabel)}</div>
      </td></tr></table>
      <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#4A4548;margin-bottom:8px;">Preferred Slots</div>
      <table width="100%" style="margin-bottom:20px;">${slotsHtml}</table>
      ${notes ? `<table width="100%" style="margin-bottom:20px;"><tr><td style="background:#FDF6F0;padding:12px 14px;border-radius:10px;">
        <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#4A4548;margin-bottom:3px;">Notes</div>
        <div style="font-size:13px;color:#4A4548;line-height:1.6;white-space:pre-wrap;">${escapeHtml(notes)}</div>
      </td></tr></table>` : ''}
      <div style="text-align:center;">
        <a href="https://trainwithbuse.com/admin.html" style="display:inline-block;padding:13px 28px;background:#2D2A2E;color:#FDF6F0;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;border-radius:50px;">Open Admin Panel →</a>
      </div>
    </td></tr>
    <tr><td style="padding:16px 32px;border-top:1px solid #F5EBE0;">
      <div style="font-size:12px;color:#4A4548;">Reply to this email to contact the client directly.</div>
    </td></tr>
  </table></body></html>`;

  // NOTE: sending to both addresses until you confirm which one should be
  // the single destination going forward — trim this array once decided.
  const result = await sendResend(env, {
    from: 'Train With Buse <hello@trainwithbuse.com>',
    to: ['hello@trainwithbuse.com', 'trainwithbuse@gmail.com'],
    reply_to: userEmail,
    subject: `New Booking — ${sessionLabel}`,
    html,
  });

  if (!result.ok) {
    return new Response('Email failed: ' + result.error, { status: 500, headers: CORS });
  }
  return new Response('OK', { headers: CORS });
}

async function handleAdminEmail({ toEmail, type, data, lang }, env) {
  let subject, html;
  data = data || {};

  if (type === 'application_accepted' || type === 'application_waitlist') {
    const email = applicationEmail(type, lang, data);
    if (!email) return new Response('Invalid application email data', { status: 400, headers: CORS });
    ({ subject, html } = email);

  } else if (type === 'confirmed') {
    const d = new Date(data.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    subject = 'Your session is confirmed!';
    html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#F5EBE0;padding:32px 16px;">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;margin:0 auto;">
      <tr><td style="background:#2D2A2E;padding:24px 32px;">
        <div style="font-family:Georgia,serif;font-size:20px;color:#FDF6F0;letter-spacing:3px;font-weight:600;">BUSE</div>
      </td></tr>
      <tr><td style="padding:32px;">
        <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#3B6D11;font-weight:600;margin-bottom:6px;">Confirmed</div>
        <div style="font-family:Georgia,serif;font-size:26px;color:#2D2A2E;margin-bottom:16px;">Your session is confirmed!</div>
        <p style="font-size:14px;color:#4A4548;line-height:1.7;margin-bottom:24px;">Your coaching session with Buse has been confirmed. See you soon!</p>
        <table width="100%" style="margin-bottom:24px;"><tr><td style="background:#EAF3DE;padding:16px 18px;border-radius:12px;border-left:3px solid #3B6D11;">
          <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#3B6D11;margin-bottom:6px;font-weight:600;">Session Details</div>
          <div style="font-size:16px;color:#2D2A2E;font-weight:500;">${escapeHtml(d)}</div>
          <div style="font-size:16px;color:#2D2A2E;">${escapeHtml(data.time)}</div>
        </td></tr></table>
        <p style="font-size:13px;color:#4A4548;line-height:1.7;">Buse will send you the Zoom link / studio details closer to your session. If you need to reschedule, reply to this email.</p>
      </td></tr>
    </table></body></html>`;

  } else if (type === 'alternative') {
    const d = new Date(data.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    subject = 'Buse has proposed a new time for your session';
    html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#F5EBE0;padding:32px 16px;">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;margin:0 auto;">
      <tr><td style="background:#2D2A2E;padding:24px 32px;">
        <div style="font-family:Georgia,serif;font-size:20px;color:#FDF6F0;letter-spacing:3px;font-weight:600;">BUSE</div>
      </td></tr>
      <tr><td style="padding:32px;">
        <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#534AB7;font-weight:600;margin-bottom:6px;">Alternative Proposed</div>
        <div style="font-family:Georgia,serif;font-size:26px;color:#2D2A2E;margin-bottom:16px;">Buse has proposed a new time.</div>
        <p style="font-size:14px;color:#4A4548;line-height:1.7;margin-bottom:24px;">Your requested time wasn't available, but Buse has suggested the following alternative:</p>
        <table width="100%" style="margin-bottom:24px;"><tr><td style="background:#EEEDFE;padding:16px 18px;border-radius:12px;border-left:3px solid #534AB7;">
          <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#534AB7;margin-bottom:6px;font-weight:600;">Proposed Time</div>
          <div style="font-size:16px;color:#2D2A2E;font-weight:500;">${escapeHtml(d)}</div>
          <div style="font-size:16px;color:#2D2A2E;">${escapeHtml(data.time)}</div>
        </td></tr></table>
        <p style="font-size:13px;color:#4A4548;line-height:1.7;">If this works for you, simply reply to this email with "Confirmed". If not, suggest another time and Buse will do her best to accommodate you.</p>
      </td></tr>
    </table></body></html>`;

  } else if (type === 'cancelled') {
    subject = 'Update on your session request';
    html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#F5EBE0;padding:32px 16px;">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;margin:0 auto;">
      <tr><td style="background:#2D2A2E;padding:24px 32px;">
        <div style="font-family:Georgia,serif;font-size:20px;color:#FDF6F0;letter-spacing:3px;font-weight:600;">BUSE</div>
      </td></tr>
      <tr><td style="padding:32px;">
        <div style="font-family:Georgia,serif;font-size:26px;color:#2D2A2E;margin-bottom:16px;">Unfortunately, that slot wasn't available.</div>
        <p style="font-size:14px;color:#4A4548;line-height:1.7;margin-bottom:24px;">We weren't able to confirm your requested session. Please reply to this email to find a suitable time, or book again through your dashboard.</p>
        <div style="text-align:center;">
          <a href="https://trainwithbuse.com/booking.html" style="display:inline-block;padding:13px 28px;background:#2D2A2E;color:#FDF6F0;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;border-radius:50px;">Book Again →</a>
        </div>
      </td></tr>
    </table></body></html>`;

  } else if (type === 'session_cancelled') {
    const d = new Date(data.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    subject = 'Your session has been cancelled';
    html = emailShell(`
        <div style="font-family:Georgia,serif;font-size:26px;color:#2D2A2E;margin-bottom:16px;">Your session has been cancelled.</div>
        <p style="font-size:14px;color:#4A4548;line-height:1.7;margin-bottom:24px;">Your session on <strong>${escapeHtml(d)}</strong> at <strong>${escapeHtml(data.time)}</strong> has been cancelled. Please reply to this email and we'll find a new time that works for you.</p>`);

  } else {
    // Unknown type — v2 silently produced an empty email (no subject/html
    // check) for anything outside confirmed/alternative/cancelled. Fail
    // loudly instead, so a mismatched `type` from the caller is visible
    // rather than silently producing a blank send.
    return new Response(`Unknown admin email type: ${type}`, { status: 400, headers: CORS });
  }

  const result = await sendResend(env, {
    from: 'Buse <hello@trainwithbuse.com>',
    to: [toEmail],
    reply_to: 'hello@trainwithbuse.com',
    subject,
    html,
  });

  if (!result.ok) {
    return new Response('Email failed: ' + result.error, { status: 500, headers: CORS });
  }
  return new Response('OK', { headers: CORS });
}

// Shared frame for client emails (same look as the templates above)
function emailShell(inner) {
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#F5EBE0;padding:32px 16px;">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;margin:0 auto;">
      <tr><td style="background:#2D2A2E;padding:24px 32px;">
        <div style="font-family:Georgia,serif;font-size:20px;color:#FDF6F0;letter-spacing:3px;font-weight:600;">BUSE</div>
      </td></tr>
      <tr><td style="padding:32px;">${inner}
      </td></tr>
    </table></body></html>`;
}

// Buse Method application emails. Copy lives here so all three languages stay side by side.
// The waitlist email's alternatives depend on what is on sale: the group classes
// sentence changes once classes are open, and The Lab System is linked only when
// it is open (otherwise it is announced as "coming soon").
const link = (href, label) => `<a href="${href}" style="color:#9B6B6F;text-decoration:underline;">${label}</a>`;

const APPLICATION_COPY = {
  en: {
    subject: 'Your Buse Method application',
    accepted: {
      heading: name => name ? `Good news, ${name}: I have a spot for you!` : 'Good news: I have a spot for you!',
      paragraphs: [
        'I\'ve gone through your application, and I\'m sure we\'ll do great work together.',
        'The next step is a free 30-minute intro call. We\'ll talk about your goals, answer your questions and look at how we\'ll move forward together. No strings attached.',
      ],
      button: 'Book your intro call →',
      after: 'If none of the times work for you, just reply to this email and we\'ll find one that does. I can\'t wait to start working with you!',
      signoff: 'See you soon,',
    },
    waitlist: {
      heading: name => name ? `Thank you for your application, ${name}.` : 'Thank you for your application.',
      paragraphs: [
        'I work with a limited number of people in The Buse Method so that every client gets my full attention. Unfortunately I don\'t have an open spot right now — but as soon as one opens up, I\'ll let you know by email.',
      ],
      alternatives: (classesOpen, labOpen) =>
        (classesOpen
          ? `If you\'d rather not wait, you can join my ${link('https://trainwithbuse.com/classes', 'live online group classes')}`
          : `If you\'d rather not wait, you can already reserve your spot in my ${link('https://trainwithbuse.com/classes', 'live online group classes')}, starting January 4`) +
        (labOpen
          ? `, or start at your own pace with my ${link('https://trainwithbuse.com/lab-system', 'Lab System video programs')}.`
          : '. My Lab System video programs are also launching very soon.'),
      closing: 'Hope to see you soon!',
      signoff: 'Warmly,',
    },
  },
  de: {
    subject: 'Deine Bewerbung für The Buse Method',
    accepted: {
      heading: name => name ? `Gute Nachrichten, ${name}: Ich habe einen Platz für dich!` : 'Gute Nachrichten: Ich habe einen Platz für dich!',
      paragraphs: [
        'Ich habe mir deine Bewerbung angesehen und bin mir sicher, dass wir gemeinsam richtig gute Arbeit leisten werden.',
        'Als Nächstes folgt ein kostenloses 30-minütiges Kennenlerngespräch. Wir sprechen über deine Ziele, klären deine Fragen und schauen, wie wir gemeinsam vorgehen. Ganz unverbindlich.',
      ],
      button: 'Kennenlerngespräch buchen →',
      after: 'Wenn keiner der Termine passt, antworte einfach auf diese E-Mail – wir finden einen. Ich freue mich schon sehr darauf, mit dir zu arbeiten!',
      signoff: 'Bis bald,',
    },
    waitlist: {
      heading: name => name ? `Danke für deine Bewerbung, ${name}.` : 'Danke für deine Bewerbung.',
      paragraphs: [
        'Bei The Buse Method arbeite ich bewusst mit wenigen Menschen, damit jede Person meine volle Aufmerksamkeit bekommt. Im Moment ist leider kein Platz frei – aber sobald einer frei wird, melde ich mich per E-Mail bei dir.',
      ],
      alternatives: (classesOpen, labOpen) =>
        (classesOpen
          ? `Wenn du nicht warten möchtest, kannst du an meinen ${link('https://trainwithbuse.com/classes-de', 'Live-Online-Gruppenkursen')} teilnehmen`
          : `Wenn du nicht warten möchtest, kannst du dir schon jetzt einen Platz in meinen ${link('https://trainwithbuse.com/classes-de', 'Live-Online-Gruppenkursen')} ab dem 4. Januar sichern`) +
        (labOpen
          ? ` – oder mit meinen ${link('https://trainwithbuse.com/lab-system-de', 'Lab System Videoprogrammen')} in deinem eigenen Tempo starten.`
          : '. Auch meine Lab System Videoprogramme sind schon bald verfügbar.'),
      closing: 'Ich hoffe, wir sehen uns bald!',
      signoff: 'Herzliche Grüße,',
    },
  },
  tr: {
    subject: 'The Buse Method başvurun',
    accepted: {
      heading: name => name ? `Güzel haber, ${name}: senin için yerim var!` : 'Güzel haber: senin için yerim var!',
      paragraphs: [
        'Başvurunu inceledim ve birlikte güzel bir iş çıkaracağımıza eminim.',
        'Sıradaki adım ücretsiz, 30 dakikalık bir ön görüşme. Hedeflerini konuşur, sorularını yanıtlar, birlikte nasıl ilerleyebileceğimize bakarız. Hiçbir bağlayıcılığı yok.',
      ],
      button: 'Tanışma görüşmeni ayarla →',
      after: 'Uygun bir saat bulamazsan bu e-postayı yanıtlaman yeterli, birlikte bir zaman buluruz. Seninle çalışmayı sabırsızlıkla bekliyorum!',
      signoff: 'Görüşmek üzere,',
    },
    waitlist: {
      heading: name => name ? `Başvurun için teşekkür ederim, ${name}.` : 'Başvurun için teşekkür ederim.',
      paragraphs: [
        'The Buse Method\'da her danışana tüm dikkatimi verebilmek için sınırlı sayıda kişiyle çalışıyorum. Ne yazık ki şu anda açık bir kontenjanım yok, ama ilk yer açıldığında sana e-postayla ulaşacağım.',
      ],
      alternatives: (classesOpen, labOpen) =>
        (classesOpen
          ? `Bu arada beklemek istemezsen, ${link('https://trainwithbuse.com/classes-tr', 'canlı online grup derslerime')} katılabilirsin`
          : `Bu arada beklemek istemezsen, 4 Ocak\'ta başlayan ${link('https://trainwithbuse.com/classes-tr', 'canlı online grup derslerime')} şimdiden yerini ayırtabilirsin`) +
        (labOpen
          ? ` ya da ${link('https://trainwithbuse.com/lab-system-tr', 'Lab System video programlarımla')} kendi temponda başlayabilirsin.`
          : '. Lab System video programlarım da çok yakında yayında olacak.'),
      closing: 'Yakında görüşmek dileğiyle!',
      signoff: 'Sevgiler,',
    },
  },
};

// Returns { subject, html } or null if the data is unusable (e.g. a non-https call link)
function applicationEmail(type, lang, data) {
  const copy = APPLICATION_COPY[lang] || APPLICATION_COPY.en;
  const accepted = type === 'application_accepted';
  const c = accepted ? copy.accepted : copy.waitlist;
  const name = escapeHtml(firstName(data.name, lang));
  if (accepted && !/^https:\/\/\S+$/.test(data.callUrl || '')) return null;

  const p = text => `<p style="font-size:14px;color:#4A4548;line-height:1.7;margin-bottom:16px;">${text}</p>`;
  const button = accepted ? `
        <div style="text-align:center;margin:28px 0;">
          <a href="${escapeHtml(data.callUrl)}" style="display:inline-block;padding:13px 28px;background:#2D2A2E;color:#FDF6F0;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;border-radius:50px;">${c.button}</a>
        </div>${p(c.after)}` : '';

  return {
    subject: copy.subject,
    html: emailShell(`
        <div style="font-family:Georgia,serif;font-size:26px;color:#2D2A2E;margin-bottom:20px;">${c.heading(name)}</div>
        ${c.paragraphs.map(p).join('')}${c.alternatives ? p(c.alternatives(data.classesOpen === true, data.labOpen === true)) : ''}${button}${c.closing ? p(c.closing) : ''}
        <p style="font-size:14px;color:#4A4548;line-height:1.7;margin-top:24px;">${c.signoff}<br>Buse</p>`),
  };
}

// First word of the full name with only its first letter capitalized
// ("buse kaya" → "Buse", "de la Cruz" → "De"); Turkish rules for tr (i → İ)
function firstName(fullName, lang) {
  const [first = ''] = String(fullName || '').trim().split(/\s+/);
  const [initial = '', ...rest] = [...first];
  return initial.toLocaleUpperCase(lang === 'tr' ? 'tr' : 'en') + rest.join('');
}

async function sendResend(env, payload) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error('Resend error:', errText);
    return { ok: false, error: errText };
  }
  return { ok: true, error: null };
}
