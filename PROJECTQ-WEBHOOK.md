# Bag work → Project Q webhook contract

For Thomas / the Project Q build. The fawkq.com Worker calls Project Q when a
bag work submission is paid, per the "Bag Working" section of the Project Q
README (the site owns tasks + judging + money; the bot owns XP + leaderboard).

## The call the website makes

`POST {PROJECTQ_WEBHOOK_URL}` (the bot's `POST /bagwork` route) with:

- Header `x-bagwork-secret: <BAGWORK_WEBHOOK_SECRET>` — shared secret, set as
  a Cloudflare Worker secret on the site side and a Render env var on the bot
  side. Reject any request where it doesn't match.
- JSON body:

```json
{
  "event": "bagwork_paid",
  "submission_id": "uuid",
  "handle": "xhandle",            // lowercase, no @
  "telegram": "tgusername",       // lowercase, no @; null if the creator skipped the field
  "tier": "meme | video | thread",
  "sol": 0.02,
  "tx_sig": "payout signature",
  "post_url": "https://x.com/handle/status/123",
  "paid_at": "ISO 8601 UTC"
}
```

- Fires only on successful payout (approve = pay on the site). Rejections and
  needs-work verdicts are not sent.

The site also sends a SECOND event type when a creator's eligibility
application is decided (creators apply BEFORE making content):

```json
{
  "event": "bagwork_clearance",
  "handle": "xhandle",
  "telegram": "tgusername | null",
  "status": "cleared | denied",
  "feedback": "reason string | null"
}
```

Suggested use: DM the member "You're cleared, go make something" with a link
to fawkq.com/bagwork — that's the moment they're most motivated. Route on the
`event` field; ignore event types you don't recognize (more may come).
- Timeout on the site side is 5s. A non-200 (or the bot being down) marks the
  submission `xp: failed` in the site's admin queue, where a "Resend XP"
  button re-sends the SAME payload. So: **make the handler idempotent** — if
  `submission_id` was already credited, return 200 and do nothing.
- `telegram` is self-reported on the submission form (decision 2026-07-21):
  credit XP to that member if they exist; if null or unknown, still count the
  piece on the Bag Workers leaderboard by X handle.
- Andrew + Thomas decision 2026-07-21: the bot auto-posts each paid piece to
  fawkq-announcements (handle, sol, Solscan link) off this same event.
- First-payout feedback (Andrew, 2026-07-21): when this is the member's FIRST
  paid piece (the bot's own payout table knows), DM them a short two-question
  feedback ask — was the rate fair for the work, and was anything about the
  process confusing. Skip when `telegram` is null.

## The endpoint the bot can read

`GET https://fawkq.com/api/bagwork/tasks` — open tasks for the `/bagwork`
command. Currently the three standing formats + rates; featured missions will
appear here later with no bot change needed:

```json
{
  "tasks": [ { "tier": "meme", "label": "Original FAWK Q meme", "sol": 0.02 }, ... ],
  "page": "https://fawkq.com/bagwork",
  "note": "Flat rate per accepted piece. No caps. Quality is the only gate."
}
```

Last verified: 2026-07-21 (tested end-to-end against a mock listener: sent,
bot-down → failed, resend → sent).

---

## Build prompt (paste into Claude Code on the Project Q side)

> Read PROJECTQ-WEBHOOK.md. Add the bag work integration to Project Q:
>
> 1. `POST /bagwork` in `src/server.js`, logic in `src/lib/bagwork.js`. Verify
>    the `x-bagwork-secret` header against `BAGWORK_WEBHOOK_SECRET` and return
>    401 on mismatch. Respond 200 fast, then process.
> 2. Idempotency: store `submission_id` in a `bagwork_payouts` table with a
>    unique constraint. If it already exists, return 200 and do nothing. The
>    website has a manual resend button, so duplicate deliveries are expected
>    and must never double-award XP or double-post.
> 3. Award XP for the tier and credit the Bag Workers leaderboard on tasks
>    completed and SOL earned. Match the member by the `telegram` field in the
>    payload. If it's null or unknown, still record the piece against the X
>    handle so the leaderboard stays complete.
> 4. Auto-post to fawkq-announcements via `TELEGRAM_ANNOUNCE_TOPIC_ID`:
>    handle, SOL amount, and the Solscan link for `tx_sig`. Under 4 lines,
>    Project Q tone.
> 5. Make the `/bagwork` command fetch `https://fawkq.com/api/bagwork/tasks`
>    and render the tasks with a link to the page. Cache briefly and fall back
>    to a short static message if the fetch fails.
> 6. Handle the `bagwork_clearance` event: on `status: "cleared"`, DM the
>    member (matched by `telegram`) a short "you're cleared, go make
>    something" with the fawkq.com/bagwork link; on `denied`, DM the reason.
>    Skip silently when `telegram` is null or unknown. Route on the `event`
>    field and ignore unknown event types.
> 7. On `bagwork_paid`, if it's this member's first paid piece (check the
>    bagwork_payouts table), DM a two-question feedback ask: was the rate
>    fair for the work, and was anything about the process confusing. Log
>    replies somewhere the founders can read.
> 8. Add `BAGWORK_WEBHOOK_SECRET` to `.env.example`.
>
> Do not build any completion-verification path. The website is the source of
> truth and the bot never self-verifies.

## What the Project Q side needs to hand back

1. The live webhook URL (e.g. `https://project-q.onrender.com/bagwork`).
2. The **bag wallet** address, created and labelled on Solscan. It goes public
   on fawkq.com/bagwork as the funding wallet.
3. A personal wallet address for the founders row on the page.
4. A **Helius RPC URL** (devnet + mainnet). The free public Solana RPCs block
   the website's requests, so the payout sender needs a real endpoint.

## Already done on the website side

- `BAGWORK_WEBHOOK_SECRET` is generated and set as a Cloudflare Worker secret.
  Andrew sends the value privately; set that exact value in Render. Do not
  generate your own.
- The small-float payout wallet exists:
  `5M2TkXay9nV2UNaKd6Eu6LGGkypu3MHbFALd75hZBghj`. Its key lives only in
  Cloudflare. This is the wallet the bag wallet tops up (keep it at 1-2 SOL);
  it is deliberately NOT the bag wallet.
- Production D1 database, admin key, and payout key are all provisioned.
