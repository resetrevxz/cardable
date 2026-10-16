// Gate: a SQLite-backed Durable Object that rate-limits and serializes. It owns no market data: D1 is the only
// source of truth. One instance per account (and per hashed network address for sign-in).
export class Gate {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.sql = ctx.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS hits (bucket TEXT NOT NULL, window INTEGER NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (bucket, window))');
    this.sql.exec('CREATE TABLE IF NOT EXISTS locks (name TEXT PRIMARY KEY, until INTEGER NOT NULL)');
  }

  // The alarm of a listing's own object: settle it if its time has come, or wait for the extended end.
  async alarm() {
    const id = await this.ctx.storage.get('listing');
    if (!id) return;
    const { settleListing, getListing } = await import('./listings.js');
    // A paused service settles nothing; the alarm comes back when the service is open again.
    const { currentMode } = await import('./maintenance.js');
    if ((await currentMode(this.env)).mode !== 'open') { await this.ctx.storage.setAlarm(Date.now() + 60_000); return; }
    try { await settleListing(this.env, id, Date.now()); } catch (error) { console.error(JSON.stringify({ alarm: id, error: String(error && error.message).slice(0, 200) })); }
    const L = await getListing(this.env, id);
    if (L && L.status === 'active') await this.ctx.storage.setAlarm(Math.max(L.ends_at, Date.now() + 1000));
  }

  async fetch(request) {
    const url = new URL(request.url), body = request.method === 'POST' ? await request.json() : {};
    const now = Date.now();
    if (url.pathname === '/hit') {
      // Fixed window counter: `limit` hits per `windowSec`, per named bucket.
      const windowSec = Math.max(1, Math.min(86400, Number(body.windowSec) || 60)), limit = Math.max(1, Number(body.limit) || 10);
      const window = Math.floor(now / (windowSec * 1000)), bucket = String(body.bucket || 'default');
      // Only this bucket's own stale windows: buckets use different window lengths, so their window numbers are not comparable.
      this.sql.exec('DELETE FROM hits WHERE bucket = ? AND window < ?', bucket, window - 2);
      const row = this.sql.exec('SELECT n FROM hits WHERE bucket = ? AND window = ?', bucket, window).toArray()[0];
      const used = row ? row.n : 0;
      if (used >= limit) return Response.json({ ok: false, retryAfter: Math.ceil(((window + 1) * windowSec * 1000 - now) / 1000) });
      this.sql.exec('INSERT INTO hits (bucket, window, n) VALUES (?, ?, 1) ON CONFLICT(bucket, window) DO UPDATE SET n = n + 1', bucket, window);
      return Response.json({ ok: true, remaining: limit - used - 1 });
    }
    if (url.pathname === '/lock') {
      const name = String(body.name || 'default'), ttl = Math.max(1000, Math.min(60000, Number(body.ttlMs) || 15000));
      const row = this.sql.exec('SELECT until FROM locks WHERE name = ?', name).toArray()[0];
      if (row && row.until > now) return Response.json({ ok: false });
      this.sql.exec('INSERT INTO locks (name, until) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET until = excluded.until', name, now + ttl);
      return Response.json({ ok: true });
    }
    if (url.pathname === '/schedule') {
      const at = Number(body.at), id = String(body.listingId || '');
      if (!/^lst_[A-Za-z0-9_-]{6,40}$/.test(id) || !Number.isSafeInteger(at)) return Response.json({ ok: false }, { status: 400 });
      await this.ctx.storage.put('listing', id);
      await this.ctx.storage.setAlarm(Math.max(at, now + 50));
      return Response.json({ ok: true });
    }
    if (url.pathname === '/unlock') {
      this.sql.exec('DELETE FROM locks WHERE name = ?', String(body.name || 'default'));
      return Response.json({ ok: true });
    }
    return new Response('not found', { status: 404 });
  }
}
