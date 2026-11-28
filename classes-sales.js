// ============================================================
// LIVE LAB CLASSES — sales switch + "Reserve your spot" form
// Load after config.js. The switch is CLASSES_SALES_OPEN in config.js:
//   data-classes-sales="open"   → Stripe buttons, shown only once sales are open
//   data-classes-sales="closed" → start date, "Reserve your spot" links and form,
//                                 shown only while sales are closed
// If config.js fails to load, the page stays in the closed state (no Stripe).
// ============================================================
const CLASSES_OPEN = typeof CLASSES_SALES_OPEN !== 'undefined' && CLASSES_SALES_OPEN === true;

document.querySelectorAll('[data-classes-sales]').forEach(el => {
  el.hidden = (el.dataset.classesSales === 'open') !== CLASSES_OPEN;
});

// Saved to Supabase (class_waitlist) AND emailed to Buse. The visitor sees an
// error only if both fail, so a signup is never lost.
async function handleReserveSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  const errorEl = form.querySelector('.reserve-error');
  errorEl.hidden = true;

  const fd = new FormData(form);
  if (fd.get('website')) { showReserveSuccess(form); return false; } // honeypot filled: quietly drop
  const row = {
    name: fd.get('name').trim(),
    email: fd.get('email').trim(),
    interests: fd.getAll('interests'),
    language: form.dataset.lang,
  };
  if (!row.name || !form.checkValidity()) { form.reportValidity(); return false; }

  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = form.dataset.sending;

  let dbError = null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/class_waitlist`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    });
    if (!res.ok) dbError = `status ${res.status}: ${(await res.text()).slice(0, 200)}`;
  } catch (err) {
    dbError = err.message || String(err);
  }
  if (dbError) console.error('Failed to save class reservation:', dbError);

  const notes = [
    dbError ? `⚠ NOT SAVED in Supabase (${dbError}) — this email is the only copy.\n` : '',
    `Name: ${row.name}`,
    `Email: ${row.email}`,
    `Interested in: ${row.interests.length ? row.interests.join(', ') : '(not specified)'}`,
    `Language: ${row.language}`,
  ].join('\n').trim();

  let emailSent = false;
  try {
    const res = await fetch('https://booking-notify.trainwithbuse.workers.dev', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail: row.email, sessionType: 'Class Waitlist (Reserve your spot)', slots: [], notes }),
    });
    emailSent = res.ok;
    if (!res.ok) console.error('Class reservation email alert failed with status ' + res.status);
  } catch (err) {
    console.error('Class reservation email alert failed:', err);
  }

  if (dbError && !emailSent) {
    btn.disabled = false;
    btn.textContent = label;
    errorEl.hidden = false;
    return false;
  }
  showReserveSuccess(form);
  return false;
}

function showReserveSuccess(form) {
  form.hidden = true;
  const success = document.getElementById('reserveSuccess');
  success.hidden = false;
  success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
