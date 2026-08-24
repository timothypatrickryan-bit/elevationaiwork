/**
 * elevation-intake — Cloudflare Worker behind https://intake.elevationaiwork.com
 *
 * Receives the project-brief form from elevationaiwork.com (JSON POST) and
 * emails it to hello@'s destination inbox via the Email Service binding.
 *
 * This file is the canonical copy of the code deployed in the Cloudflare
 * dashboard (account: Timothy.patrick.ryan@gmail.com → Workers & Pages →
 * elevation-intake). If you edit it here, re-deploy by pasting into the
 * dashboard editor or `npx wrangler deploy` with the config below.
 *
 * Required binding (Worker → Bindings): Email Service, variable name EMAIL.
 * Custom domain (Worker → Domains): intake.elevationaiwork.com.
 *
 * wrangler.toml equivalent:
 *   name = "elevation-intake"
 *   main = "worker/intake.js"
 *   compatibility_date = "2025-09-01"
 *   send_email = [{ name = "EMAIL" }]
 */
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const ALLOW = ['https://elevationaiwork.com', 'https://www.elevationaiwork.com'];
    const cors = {
      'Access-Control-Allow-Origin': ALLOW.includes(origin) ? origin : ALLOW[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin'
    };
    const json = (o, s) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', ...cors } });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405);
    let d;
    try { d = await request.json(); } catch (e) { return json({ error: 'invalid JSON' }, 400); }
    if (typeof d !== 'object' || d === null) return json({ error: 'invalid body' }, 400);
    if (d.website) return json({ ok: true }, 200); // honeypot: pretend success, send nothing
    const clean = (v, n) => String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').trim().slice(0, n);
    const name = clean(d.name, 200);
    const company = clean(d.company, 200);
    const email = clean(d.email, 200);
    const timeline = clean(d.timeline, 100);
    const solutions = Array.isArray(d.solutions) ? d.solutions.slice(0, 6).map(s => clean(s, 100)) : [];
    const problem = String(d.problem == null ? '' : d.problem).trim().slice(0, 5000);
    if (!name || !problem || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'missing required fields' }, 400);
    const body = [
      'Name: ' + name,
      'Company: ' + (company || '-'),
      'Email: ' + email,
      'Interested in: ' + (solutions.length ? solutions.join('; ') : '-'),
      'Timeline: ' + (timeline || '-'),
      '',
      'Problem / desired outcome:',
      problem,
      '',
      '--',
      'Sent from the intake form on elevationaiwork.com'
    ].join('\n');
    try {
      await env.EMAIL.send({
        from: 'intake@elevationaiwork.com',
        to: 'timothy.patrick.ryan@gmail.com',
        subject: 'Project brief - ' + (company || name),
        text: body
      });
    } catch (e) {
      console.error('send failed', e && e.message);
      return json({ error: 'send failed' }, 502);
    }
    return json({ ok: true }, 200);
  }
};
