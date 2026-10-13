// Closing a listing exactly on time without anyone being online: a Durable Object alarm per listing, set for its end and
// set again when a late bid extends it. The alarm only asks for the settlement; what is settled never depends on when
// the alarm ran (see settleListing). A cron sweep repeats the same call as a backstop.
export async function scheduleClose(env, listingId, at) {
  try {
    const stub = env.GATE.get(env.GATE.idFromName('listing:' + listingId));
    await stub.fetch('https://gate/schedule', { method: 'POST', body: JSON.stringify({ listingId, at }) });
  } catch (_) { /* the cron sweep and lazy settlement cover a missed alarm */ }
}
