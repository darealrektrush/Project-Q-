# Bond the Duck — Build & Automation Guide (Project Q × CrabStar Oracle)

**Status:** implementation guide (design/build authority only — does not authorize
token transfers, Squads execution, wallet/contract creation, or campaign activation).
Those require the readiness evidence and dual‑founder approvals defined in the
*Bond the Duck Corrected Master Specification* and its Appendix A/B.

**Audience:** whoever builds this out (an engineer, or Claude Code) plus Founders A/B
and reviewers.

**Source of truth precedence**

1. *Bond the Duck — Corrected Master Specification* + **Appendix A (49‑decision register)** — the policy. If code and register conflict, the register controls.
2. **Appendix B — Deployment Registry** — production values (addresses, feeds, source classifications). Blank fields are deployment work, not open questions.
3. This document — *how* to build it, grounded in the current repos.

> **Golden rule (carve it into every service):** *Project Q calculates, verifies,
> publishes and prepares proposals. It never holds a treasury signer, never has
> unilateral spending authority, and never silently changes a finalized rule or
> allocation.* The Oracle verifies raid actions and reports XP; it never touches money.

---

## 0. What we are building, in one paragraph

Bond the Duck is a **10‑day, five‑cycle (48h each) holder‑acquisition + verified‑participation
campaign** that distributes **15,000,000 FAWKQ** (7.5M "combined verified activity" +
7.5M "buy‑to‑earn"), plus a separate post‑unlock **2.5M Diamond Duck** bonus. The campaign
**engine** (state machine, enrollment/identity, XP ledger, combined leaderboard, cycle
finalizer with commit‑and‑reveal draw, allocation engine, manifest/proposal builder,
transparency publisher) lives in **Project Q**. **CrabStar Oracle** already runs X raids
and *machine‑verifies* raid actions (like/retweet/reply/bookmark/quotepost, deduped by X
identity) — it becomes the campaign's **verified‑raid XP source**, feeding Project Q through
one signed, idempotent webhook. Money moves only through a **Squads 2‑of‑3** treasury via
hashed manifests and two founder approvals — never from an automated key.

```
                 verified raid actions (X machine-verified)
  CrabStar Oracle ───────────────────────────────────────────►  Project Q
  (raids.py,                 POST /campaign/raid-xp              (campaign engine)
   raid_verification         x-oracle-secret: <shared>              │
   _service.py)              idempotent per (raid_id,x_id,action)   │ computes XP,
        ▲                                                          │ leaderboard,
        │ raid launch / progress (unchanged, still in Oracle)      │ winners, draws,
        │                                                          ▼ allocations
   FawkQ community ◄── Telegram menu / dashboard ◄──────  Supabase (append-only ledgers)
                                                                   │ builds hashed
                                                                   ▼ CSV/JSON manifest
                                                    Founders A/B ── Squads 2-of-3 ── SPL batch transfer
                                                    (dual approve)  (the only signer of money)
```

---

## 1. Where each piece lives (map to the current code)

### Project Q (`darealrektrush/Project-Q-`, Node ESM on Render)

Already present and reused as‑is:

| Existing file | What it gives us for Bond the Duck |
|---|---|
| `src/server.js` | Express app, Telegram webhook, **topic guard**, and the existing **`POST /bagwork`** secret‑guarded webhook — the exact pattern we copy for the Oracle raid webhook. |
| `src/lib/supabase.js` | Thin Supabase REST client (`select/insert/update/upsert/rpc`) with the service‑role key. All new tables use it. |
| `src/lib/xp.js` | `awardXp()` → `increment_user_xp` RPC (atomic). Campaign XP must **not** reuse this global ledger directly (see §5) but follows the same atomic‑RPC discipline. |
| `src/lib/bagwork.js` | Reference implementation of a **signed, idempotent inbound webhook**: verify secret → 200 fast → dedupe on a unique key → award. Copy its shape for `campaign/raid-xp`. |
| `src/lib/splitRewards.js` + tests | Locked integer‑math split. Bond the Duck adds its **own** pure allocation module in the same style (floor‑and‑absorb‑remainder, unit‑tested, base‑unit integers only). |
| `jobs/distribute.js`, `render.yaml` cron | The "cron job that skips unless enough real time elapsed" pattern — reused for cycle open/close, reminders, and release schedulers. |
| `src/lib/telegram.js` | Topic‑aware `sendMessage`/edit — used for reminders, results, and dashboard links. |
| `supabase/schema.sql` | Where the new campaign tables are appended (§4). Note it already uses **RLS‑on / service‑role‑only**, integer money columns, and `security_invoker` views — match that. |

New in Project Q (all additive; nothing above is modified in behavior):

```
src/campaign/
  state.js          # campaign state machine (DRAFT…ARCHIVED, §3) + registry binding
  identity.js       # Telegram/X/wallet linkage + 10-min signed wallet challenge (§5)
  xpLedger.js       # append-only campaign XP with daily caps (15/20/75) (§6)
  ingest.js         # signed, idempotent event intake (Oracle raid, votes, missions)
  leaderboard.js    # ONE combined cycle leaderboard (§7)
  finalizer.js      # cutoff snapshot, cooldown, top-2, commit-and-reveal draw (§7)
  allocate.js       # activity + buy-to-earn + Diamond Duck, caps, redistribution (§8,10,11)
  manifest.js       # versioned identical CSV/JSON + hash + reconciliation (§10)
  proposal.js       # BUILD-ONLY unsigned Squads proposal descriptor (never signs) (§9)
  chain.js          # approved-market swaps, migration detect, finality, TWAP (§8,9)
  registry.js       # loads/validates the Deployment Registry (Appendix B)
jobs/
  campaign-tick.js  # cron: reminders (24h/1h), cycle close, draw, release scheduler
  campaign-snapshot.js # cron: Day-10 final snapshot ($2 TWAP), immutable close snapshots
src/server.js       # + POST /campaign/raid-xp (and /campaign/vote-xp) guarded routes
supabase/
  bond_the_duck.sql # all campaign tables/views/RPCs (§4)
tests/
  allocate.test.js  draw.test.js  reconcile.test.js  caps.test.js
BOND-THE-DUCK-BUILD.md   # this file
```

### CrabStar Oracle (`darealrektrush/CrabStar_Oracle`, Python on Render)

Already present and reused as‑is:

| Existing file | Role in Bond the Duck |
|---|---|
| `src/handlers/raids.py`, `src/services/raid_service.py` | Launch/run raids, targets, participants. **Unchanged.** |
| `src/services/raid_verification_service.py` | The value we connect: **X‑machine‑verified** actions, deduped by `x_user_id`, settled to `raid_action_verifications`. Its `record_verified_action` / `award_outstanding_xp` are the emit points. |
| `src/services/x_service.py`, `webhooks/x_oauth.py`, `src/services/x_link_service.py` | X identity linkage + API verification already in production. |
| `supabase/migrations/20260809_raid_action_verifications.sql` | The verified‑action table the emitter reads from. |

New in Oracle (thin, additive — the Oracle stays a *reporter*):

```
src/services/campaign_emit.py   # POST verified raid action to Project Q, signed + idempotent
webhooks/campaign_backfill_cron.py  # cron: re-send any unacked verified actions (at-least-once)
BOND-THE-DUCK-ORACLE-INTEGRATION.md # companion doc (contract, env, runbook)
```

---

## 2. The one integration that "connects the Oracle for the raids"

This is the crux of the request. The Oracle **already** decides, per raid action, whether a
real X identity actually performed a like/retweet/reply/bookmark/quotepost. Bond the Duck
needs those as **campaign XP events**, one credit per *unique eligible action* (Spec §6,
register #12/#15; §15 "XP ingestion: signed, idempotent Oracle/Project Q/source events").

### 2.1 Contract — Oracle → Project Q

**Endpoint (Project Q):** `POST /campaign/raid-xp`
**Auth:** header `x-oracle-secret: <ORACLE_CAMPAIGN_SECRET>` — a shared secret, set as a
Render env var on **both** services. Reject with `401` on mismatch. (Same discipline as the
existing `x-bagwork-secret` guard in `src/lib/bagwork.js`.)

**Body (one event per verified action):**

```json
{
  "event": "raid_action_verified",
  "campaign_id": "bond-the-duck-2026",
  "cycle_id": 3,
  "raid_id": "uuid-from-oracle-raids-table",
  "action": "like|retweet|reply|bookmark|quotepost",
  "x_user_id": "stable X numeric id",
  "telegram_user_id": 123456789,
  "tweet_id": "target tweet id",
  "verified_at": "ISO-8601 UTC",
  "idempotency_key": "raid_id:x_user_id:action"
}
```

**Idempotency (mandatory both sides).** Project Q stores `idempotency_key` with a UNIQUE
constraint (`campaign_raid_events`, §4). If it already exists → return `200 {"ok":true,
"duplicate":true}` and do nothing. The Oracle backfill cron re‑sends unacked events, so
duplicates are *expected* and must never double‑award. **Dedupe by
`(raid_id, x_user_id, action)`** — never by Telegram id (the Oracle already dedupes by X
identity; mirror that so a user with two Telegram sessions can't farm one action twice).

**Eligibility is decided in Project Q, not the Oracle.** The Oracle reports *"this X
identity did this action, verified."* Project Q then applies: campaign enrollment, the
`x_user_id`↔participant link, the **one‑credit‑per‑unique‑action** rule, **daily caps**
(participation 15, overall 75), the current **cycle window**, and whether the participant is
wallet‑ready. An event for an unknown/unenrolled `x_user_id` is **stored but not credited**
(kept for audit and late‑enroll reconciliation) — return `200 {"ok":true,"credited":false,
"reason":"unmatched"}`.

**Response contract**

| Situation | HTTP | Body |
|---|---|---|
| Accepted + credited | 200 | `{"ok":true,"credited":true,"xp":N}` |
| Accepted, not credited (cap hit / unmatched / cycle closed) | 200 | `{"ok":true,"credited":false,"reason":"cap|unmatched|cycle_closed"}` |
| Duplicate | 200 | `{"ok":true,"duplicate":true}` |
| Bad/absent secret | 401 | `{"ok":false}` |
| Malformed body | 400 | `{"ok":false,"reason":"..."}` |

The Oracle marks an event **acked** only on a 200. Anything else → retry via the backfill
cron (3 controlled retries, then leave it queued; never silently drop — Spec §14).

### 2.2 Oracle side (emit)

Add `src/services/campaign_emit.py`. Hook it where a verified action is finalized in
`raid_verification_service.record_verified_action()` / `award_outstanding_xp()`: after the
Oracle's own XP settles, enqueue a campaign event row (Oracle Supabase) and POST it. Keep the
Oracle's existing raid XP untouched — campaign XP is a **separate ledger** in Project Q; the
same verified action legitimately produces Oracle‑community XP *and* campaign XP (they are
different economies, register #14 only forbids double‑counting **paid Bagwork** into
campaign XP).

Emit is **best‑effort inline + guaranteed by cron**: the inline POST keeps latency low; the
`campaign_backfill_cron.py` re‑sends any row without an ack. This is the same at‑least‑once
posture the Oracle already uses for queue advancement.

### 2.3 Why a webhook and not a shared DB write

Project Q and the Oracle run on separate Supabase projects and separate Render services. A
signed HTTP event with an idempotency key is auditable (Spec wants *signed, idempotent
source events*), lets Project Q own **all** eligibility/caps/finality logic in one place, and
keeps the custody/compute boundary clean: the Oracle can *report* but can never *credit* or
*pay*.

---

## 3. Campaign state machine (build this first, in `src/campaign/state.js`)

Spec §15 states, exit‑gated. Nothing advances a state without its exit evidence.

```
DRAFT             → rules complete + versioned (rules hash stored)
READINESS_BLOCKED → any mandatory readiness item incomplete (§16 gate)
FUNDED            → 15M FAWKQ + 0.25 SOL + labeled vaults verified on-chain
SCHEDULED         → registry + rules hash + source certifications + public times published
ACTIVE            → 10-day earning window in progress (5×48h cycles)
VERIFYING         → finality, evidence, pricing, Sybil review, appeals (48–72h; Day 13)
ALLOCATIONS_FROZEN→ final manifest versions + hashes published
DISTRIBUTING      → approved scheduled batch transfers in progress
COMPLETED         → all paid / pending-recovery / reserve-bound and reconciled
ARCHIVED          → signed closeout + permanent public archive
PAUSED / TERMINATED → incident + cancellation rules; never bypass earned-reward protection
```

Implementation notes:

- The state and the **launched ruleset are immutable + hashed** (`ruleset_versions`). Any
  post‑launch change to a *new* mission requires both founders + a public announcement
  *before* participation (register #37).
- Emergency **pause requires two authorized signers**; resuming distributions requires both
  founders. A security/data‑integrity incident **auto‑pauses treasury distributions**.
- Store the campaign row + registry binding first; every later service reads the frozen
  ruleset by version, never hard‑coded constants.

---

## 4. Data model (`supabase/bond_the_duck.sql`)

Append in the existing style of `supabase/schema.sql`: **RLS on, no policies** (service‑role
only), **integer base units** for all FAWKQ amounts (`numeric(39,0)` / `bigint` — *never*
float), append‑only ledgers, and `security_invoker` views. Core entities (Spec §15):

```sql
-- Immutable launched config + hash. One row per version; never update in place.
create table if not exists campaigns (
  id text primary key,                    -- 'bond-the-duck-2026'
  ruleset_version int not null,
  rules_hash text not null,
  state text not null default 'DRAFT',
  funded_base_units numeric(39,0) not null default 0,  -- must equal 15_000_000 * 10^decimals at FUNDED
  created_at timestamptz not null default now()
);

create table if not exists ruleset_versions (
  campaign_id text not null references campaigns(id),
  version int not null,
  rules_json jsonb not null,
  rules_hash text not null,
  created_at timestamptz not null default now(),
  primary key (campaign_id, version)
);

-- Appendix B, versioned; never overwrite history.
create table if not exists deployment_registry (
  campaign_id text not null references campaigns(id),
  version int not null,
  field text not null,
  value text,                              -- public values only; NEVER secrets/keys
  owner text,
  evidence_url text,
  registry_hash text,
  created_at timestamptz not null default now(),
  primary key (campaign_id, version, field)
);

create table if not exists identity_links (
  campaign_id text not null references campaigns(id),
  telegram_user_id bigint not null,
  x_user_id text,                          -- unique per campaign
  reward_wallet text,                      -- unique per campaign
  x_verified_at timestamptz,
  wallet_verified_at timestamptz,
  fawkq_token_account text,                -- existing ATA proven; we NEVER create it
  enrolled_at timestamptz not null default now(),
  primary key (campaign_id, telegram_user_id),
  unique (campaign_id, x_user_id),
  unique (campaign_id, reward_wallet)
);

create table if not exists wallet_challenges (
  id bigserial primary key,
  campaign_id text not null,
  telegram_user_id bigint not null,
  nonce text not null,
  expires_at timestamptz not null,         -- 10 minutes
  consumed_at timestamptz
);

-- Append-only campaign XP. Daily caps enforced in the RPC, not the app.
create table if not exists xp_ledger (
  id bigserial primary key,
  campaign_id text not null,
  cycle_id int not null,
  telegram_user_id bigint not null,
  source text not null,                    -- raid | vote | mission | event | content | onboarding
  amount int not null,
  mission_code text,
  idempotency_key text not null,
  awarded_at timestamptz not null default now(),
  unique (campaign_id, idempotency_key)
);

-- Raw inbound verified-raid events from the Oracle (audit + late reconcile).
create table if not exists campaign_raid_events (
  id bigserial primary key,
  campaign_id text not null,
  cycle_id int,
  raid_id text not null,
  action text not null,
  x_user_id text not null,
  telegram_user_id bigint,
  tweet_id text,
  idempotency_key text unique not null,    -- 'raid_id:x_user_id:action'
  credited boolean not null default false,
  reason text,                             -- cap | unmatched | cycle_closed | ok
  received_at timestamptz not null default now()
);

create table if not exists verification_sources (   -- 7 listing sources + 4 TG bots
  campaign_id text not null,
  source_key text not null,
  classification text not null,            -- MACHINE_VERIFIED | PROOF_SUPPORTED | COMMUNITY_PROGRESS_ONLY | SOURCE_UNAVAILABLE | REMOVED_FOR_INTEGRITY
  cooldown_seconds int not null default 0,
  health text,
  primary key (campaign_id, source_key)
);

create table if not exists cycles (
  campaign_id text not null,
  cycle_id int not null,                   -- 1..5
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  cutoff_slot bigint,
  cutoff_blockhash text,
  commit_hash text,                        -- published BEFORE close
  reveal_value text,                       -- published AFTER close
  fallback_used boolean not null default false,
  allocation_base_units numeric(39,0) not null,   -- 1_500_000 * 10^decimals
  finalized_at timestamptz,
  primary key (campaign_id, cycle_id)
);

create table if not exists cycle_winners (
  campaign_id text not null,
  cycle_id int not null,
  position int not null,                   -- 1..5
  telegram_user_id bigint not null,
  selection text not null,                 -- auto_top2 | weighted_draw
  draw_index int,
  primary key (campaign_id, cycle_id, position)
);

create table if not exists positions (     -- buy-to-earn net-buy accounting
  campaign_id text not null,
  reward_wallet text not null,
  eligible_bought_base_units numeric(39,0) not null default 0,
  eligible_sold_base_units numeric(39,0) not null default 0,
  net_buy_lamports bigint not null default 0,   -- SOL net, threshold basis
  tier int,                                -- 1 | 2 | null
  weight int not null default 0,           -- 1 | 3 | 0
  snapshot_usd numeric,                     -- Day-10 $2 test (informational + gate)
  eligible boolean not null default false,
  primary key (campaign_id, reward_wallet)
);

create table if not exists allocations (
  id bigserial primary key,
  campaign_id text not null,
  category text not null,                  -- activity | buy_to_earn | diamond_duck
  cycle_id int,
  telegram_user_id bigint,
  reward_wallet text not null,
  gross_base_units numeric(39,0) not null,
  calc_version int not null,
  manifest_version int,
  eligibility_status text not null,
  created_at timestamptz not null default now()
);

create table if not exists releases (      -- the phased schedule per allocation
  id bigserial primary key,
  allocation_id bigint not null references allocations(id),
  pct int not null,                        -- 25 / 50 / 5... or 25 / 15...
  scheduled_at timestamptz not null,
  amount_base_units numeric(39,0) not null,
  status text not null default 'scheduled',-- scheduled | proposed | paid | failed | recovered | reserve
  payment_key text unique not null         -- prevents double payment
);

create table if not exists manifests (
  id bigserial primary key,
  campaign_id text not null,
  category text not null,
  version int not null,
  csv_hash text not null,
  json_hash text not null,
  manifest_hash text not null,             -- the value both founders check before approving
  network text not null default 'mainnet', -- mainnet | devnet — a manifest is single-network; the finalizer refuses to mix
  supersedes int,
  created_at timestamptz not null default now(),
  unique (campaign_id, category, version)
);

create table if not exists treasury_transactions (
  id bigserial primary key,
  campaign_id text not null,
  payment_key text not null references releases(payment_key),
  squads_proposal_ref text,
  tx_signature text,
  status text not null,                    -- proposed | approved | executed | failed
  network text not null default 'mainnet', -- mainnet | devnet — tags rehearsal runs so they can't be mistaken for real ones
  confirmed_block_time timestamptz,
  reconciliation_status text,
  created_at timestamptz not null default now()
);

create table if not exists reserve_ledger (
  id bigserial primary key,
  campaign_id text not null,
  reason text not null,                    -- capped | fewer_than_five | unawarded | disqualified | failed_recovery | rounding
  amount_base_units numeric(39,0) not null,
  ref text,
  created_at timestamptz not null default now()
);

create table if not exists audit_log (
  id bigserial primary key,
  campaign_id text not null,
  actor text not null,                     -- reviewer | operator | founder_a | founder_b | system
  action text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);
```

Then, matching `schema.sql`'s footer: `alter table … enable row level security;` on every
table, and `security_invoker = on` on any view. Add RPCs for the two things that must be
atomic: **capped XP award** (`award_campaign_xp` — enforces 15/20/75 daily caps inside the
insert, like `increment_user_xp` does) and **credit‑once raid event**
(`credit_raid_event` — insert‑on‑conflict‑do‑nothing on `idempotency_key`, returns whether it
credited).

**Invariants to encode as tests / CHECKs (Spec Appendix C):**

- Funded amount == exactly `15,000,000` FAWKQ base units before ACTIVE.
- Activation Vault (1,875,000) + Scheduled Vault (13,125,000) == 15,000,000 at funding.
- Σ activity gross ≤ 7,500,000; Σ buy‑to‑earn gross ≤ 7,500,000.
- ≤ 5 unique winners per cycle; positions 1–2 deterministic, exactly 3 draw‑selected.
- `paid + scheduled + failed/recovery + reserve` reconciles to funded base units, always.
- No successful `payment_key` executes twice.
- Diamond Duck reconciles to exactly 2,500,000 after full funding, **separately**.

---

## 5. Enrollment, identity & wallet readiness (`src/campaign/identity.js`)

- **One** Telegram + **one** X + **one** reward wallet per participant (register #16). TG and
  X accounts must **predate launch by ≥14 days** — check account‑creation metadata during
  enroll; reject younger accounts.
- **Wallet control proof:** single‑use, **10‑minute** signed‑message challenge containing
  `campaign_id · telegram_id · nonce · expiry`. Verify the signature against `reward_wallet`;
  mark `wallet_verified_at`; consume the nonce (`wallet_challenges`). Reuse the Oracle's
  existing X‑OAuth link for the X side (`x_link_service.py`) rather than re‑implementing.
- **We never create ATAs.** Cycle entry requires an **existing** FAWKQ token account
  (register #18/#19). Warn before the deadline; a missing ATA = "cannot win this cycle."
- **Day‑10 final eligibility** additionally requires ≥ **USD $2** of FAWKQ at the approved
  **30‑minute TWAP** (register #20). Wallet changes **lock at cycle close**; a compromised
  wallet needs a documented migration + dual‑founder approval, audit‑logged (no silent edits).

Keep campaign XP in `xp_ledger` **separate** from the global `users.xp` economy in
`src/lib/xp.js`. They can co‑exist (a member has community XP and campaign XP), but campaign
winner selection reads only frozen campaign XP.

---

## 6. Verified participation & XP (`src/campaign/xpLedger.js`, `ingest.js`)

Fixed published XP (register #12), frozen at launch:

| Activity | XP | Verification |
|---|---|---|
| Verified X raid action | per raid catalogue | **Oracle/X machine‑verify**, 1 credit / unique action (§2) |
| Verified listing vote | per certified source | machine full / proof‑supported reduced / aggregate‑only = no individual XP |
| Space/event attendance | 5 | check‑in code / verifiable presence |
| Educational/onboarding task | 3 | approved submission |
| Approved idea/contribution | 5 | reviewer‑approved vs prepublished reqs |
| Help a new participant onboard | 5 | newcomer independently eligible |
| Standard mission | 5 | published rules + deadline |
| Advanced mission | 10 | published advanced reqs |
| Approved original content | 10 | unique/public/quality; no double Bagwork credit |

**Daily caps (enforced in `award_campaign_xp` RPC, not the handler):** participation **15/day**,
Project Q missions **20/day**, **overall 75/day**. Paid Bagwork does **not** also earn campaign
XP unless a published mission explicitly allows (register #14).

**Source certification** (`verification_sources`): all **7 listing sources + 4 Telegram
voting bots** must be tested and classified in the registry *before* launch; classifications,
cooldowns and health are **public**. No captcha bypass, no automated voting, no prohibited
scraping.

---

## 7. Combined leaderboard, cutoff & public draw (`leaderboard.js`, `finalizer.js`)

**One** Bond the Duck Activity Leaderboard combines: verified X raids (from the Oracle) +
verified listing votes + approved participation + Project Q campaign XP. Raids and votes are
**not** separate pools (register #7).

Per‑cycle allocation is **1,500,000 FAWKQ**, five winners:

1. Freeze verified cycle XP, eligibility and wallet‑readiness at the **cutoff slot** (first
   finalized Solana slot ≥ the published 8:00 AM Pacific deadline).
2. Apply the **one‑cycle winner cooldown**; rank remaining eligible participants.
3. **Positions 1 & 2** → the two highest eligible XP totals (deterministic).
4. Build the weighted pool from remaining eligible **Top 15**, weight ∝ verified cycle XP.
5. Select **3** unique winners **without replacement** via commit‑and‑reveal.
6. Publish: eligible Top 15, XP weights, commitment, reveal, finalized blockhash, cycle id,
   draw order, and any redraw indices — **anyone can reproduce it**.

**Commit‑and‑reveal seed (register #11):** before close, publish `commit_hash =
H(secret)`. After close, reveal `secret` and combine with the **first finalized Solana
blockhash after the deadline** + `cycle_id`. If Project Q misses its reveal deadline, the
**Solana‑only fallback seed** activates automatically (`fallback_used = true`). Ineligible/
duplicate draws use **published** redraw indices — no private redraw ever.

The five winner‑position **percentages** live in the Deployment Registry and must sum to
**exactly 100%** of the 1,500,000 cycle pool. Do **not** inherit the rejected "draw order
alone decides winners" rule. `tests/draw.test.js` must reproduce a full draw from published
inputs and from the fallback path.

**Release schedule per activity award (register #26):** 25% immediate (2–6h after cycle
verification) · 50% Day 13 · 25% as **five equal 5%** releases over 30 days, each at 8:00 AM
Pacific.

---

## 8. Buy‑to‑earn engine (`chain.js`, `allocate.js`)

| Tier | 10‑day net‑buy | Weight |
|---|---|---|
| Tier 1 | ≥ 0.07 SOL and < 0.20 SOL | 1 |
| Tier 2 | ≥ 0.20 SOL | 3 (Tier 1 does not stack) |

`reward = 7,500,000 × wallet_weight ÷ Σ eligible_weights`, subject to the published
per‑wallet cap with **iterative redistribution** of excess among uncapped wallets.

**Eligible net buy** = eligible FAWKQ bought − eligible FAWKQ sold, counting only successful,
finalized purchases through **approved markets** during the 10 active days. Exclude transfers,
OTC, reward distributions, LP in/out, founder/team allocations, failed/reversed swaps,
self‑swaps, wash trading, circular/coordinated cycling. Related wallets reviewed together;
suspected manipulation → review + 48h appeal before disqualification. Zero/negative net
buyer → no allocation.

**Approved markets:** Pump.fun bonding curve before bond → official PumpSwap FAWKQ/SOL pool
after migration; both count during a verified transition; Jupiter routes count **only** when
settlement uses an approved market. Reuse the Oracle's Helius plumbing / Project Q's
`src/lib/solana.js` for indexing; store every swap in `positions` with finality + exclusion
reason.

---

## 9. Snapshots, price & finality (`chain.js`)

- FAWKQ/SOL: official Pump.fun curve (pre‑bond) → official PumpSwap pool (post‑migration);
  registered secondary only under the published fallback.
- SOL/USD: **Pyth** primary → **Switchboard** fallback → documented Jupiter reference only if
  both oracles fail. Reject stale/missing observations; **material source disagreement pauses
  automatic finalization**. Any fallback‑price decision needs **both founders + public
  documentation**; undisclosed manual price entry is prohibited.
- Final eligibility price = **30‑minute TWAP** over finalized observations, continuous across
  a migration.
- Cutoff = first finalized slot ≥ 8:00 AM Pacific. A tx counts if its confirmed on‑chain
  block time precedes the deadline (even if finalized slightly later); failed/dropped/
  expired/backdated do not.

---

## 10. Distribution engine & manifests (`manifest.js`, `proposal.js`)

Project Q **builds** distribution; it never signs. Flow per batch:

1. `allocate.js` computes gross allocations (base‑unit integers) + the release schedule.
2. `manifest.js` writes **identical CSV and JSON**, hashes each, then hashes the final
   manifest (`manifest_hash`). Required fields (Spec §10): campaign+cycle id, manifest
   version, anonymized participant id, recipient wallet, reward category, gross allocation,
   release %, transfer amount, remaining scheduled balance, eligibility status, calc version,
   evidence/result hash, scheduled execution, tx signature, reconciliation status.
3. `proposal.js` emits an **unsigned** Squads proposal descriptor (recipient list + totals).
   **The proposal total and recipient list must match `manifest_hash` before either founder
   approves.** Project Q stores the ref; humans approve in Squads.
4. On execution, `campaign-tick` matches tx signatures back to `releases`/`treasury_transactions`,
   updates remaining balances, and reconciles.

**Rules:** unique `payment_key` per release prevents double payment; retries target only
failed/unconfirmed transfers (3 attempts, 30‑day recovery, then Reserve — register #30). Every
batch reconciles `paid + scheduled + failed + reserve` to the exact funded base‑unit supply.
Corrections create a **new visible manifest version**; originals remain available. Delays need
a public reason + revised target; **signer absence never lowers the 2‑of‑3 threshold**.

---

## 11. Diamond Duck bonus (`allocate.js`, separate accounting)

Separate **2,500,000 FAWKQ**, **not** part of the 15M and not shown as campaign treasury at
launch. Checkpoint = the **actual on‑chain founders' Streamflow unlock timestamp**. Freeze
eligible wallet histories at that timestamp. Each founder transfers **1,250,000 within 48h**;
show **"Funding Pending"** until the full 2.5M is verified. Allocate proportionally *after*
full funding with a **250,000 per‑wallet cap** + iterative redistribution; publish preliminary
allocations with a **48h correction window**; then hash the manifest and pay **25% + five
15%** over 30 days. Rounding residue → Reserve. Selling after the checkpoint does **not** cancel
an earned allocation. Reconciles to exactly 2,500,000, independently of the 15M.

---

## 12. Treasury & custody (design constraints the code must honor)

- **One Squads treasury**, separately labeled accounts: Cycle Activation Vault (1,875,000),
  Scheduled Distribution Vault (13,125,000), Campaign Community Reserve (0 at launch),
  Diamond Duck Bonus Vault (2,500,000 post‑unlock), SOL Operations Wallet (0.25 SOL).
- **2‑of‑3 signers:** Founder A, Founder B, one **offline recovery signer** (emergency only).
- **No private key or seed phrase** in Project Q, Oracle, Render, Supabase, source control,
  logs or chat. The Deployment Registry stores **public** values only.
- Project Q may build unsigned proposals and verify execution; it **cannot** approve or
  execute. Encode this as a hard boundary — there is no code path that signs a treasury
  transfer, and `proposal.js` has no signing dependency.
- Reserve can never return to founders; future use needs **two Squads approvals + a public
  proposal** (register #31).

---

## 13. Automation map (what runs on a schedule)

All via Render Cron (same pattern as `render.yaml`'s existing crons). Every job is
**idempotent** and re‑entrant — it reads state from Supabase and does nothing if the
precondition isn't met, exactly like `jobs/distribute.js` skipping unless 72h elapsed.

| Job | Cadence | Does |
|---|---|---|
| `campaign-tick` | every 5–15 min | send 24h/1h reminders; at a cycle's `closes_at`, snapshot cutoff slot/blockhash, freeze XP, run top‑2 + reveal draw, write immediate 25% manifest (proposal built, **not** paid); advance release schedule; match executed txs + reconcile |
| `campaign-snapshot` | daily + Day‑10 | Day‑10 final snapshot ($2 TWAP, net buys, cutoff data); write immutable versioned close snapshots + hashes |
| `campaign_backfill_cron` (Oracle) | every 5 min | re‑POST any verified raid event without a Project Q ack (at‑least‑once) |
| existing `project-q-distribute` | unchanged | the 75/15/10 creator‑reward cycle — **independent** of Bond the Duck |

**Automation boundary:** cron jobs *prepare and publish*; they never move money. The only
step that isn't automated is the two‑founder Squads approval — by design. "Automate it" means
everything up to the signature is hands‑off; the signature stays human (Golden rule + register
#27/#37).

Outage rules the ticker must implement (Spec §14): source unavailable → mark
`SOURCE_UNAVAILABLE`, don't penalize; Project Q/Oracle outage > 30 min → extend affected
deadlines by the outage; > 4 h → pause cycle until both founders publish a revised close;
incomplete verification data → do **not** finalize.

---

## 14. Build sequence (paste‑into‑Claude‑Code order)

Sequenced so each step ships something testable and later steps depend on earlier ledgers.
Prefix each with *"Read BOND-THE-DUCK-BUILD.md and Appendix A/B."*

1. **Schema + state machine.** Create `supabase/bond_the_duck.sql` (all tables/views/RPCs,
   RLS‑on, integer money) and `src/campaign/state.js` + `registry.js`. Load the ruleset,
   store its hash. No behavior yet — just the ledgers and state transitions with tests.
2. **Identity & enrollment.** `identity.js` + the 10‑minute wallet challenge; reuse the
   Oracle X‑link. Enforce one‑TG/one‑X/one‑wallet + 14‑day age. Wire enroll into the menu.
3. **Oracle raid webhook (the connection).** Add guarded `POST /campaign/raid-xp` to
   `src/server.js` + `ingest.js` (copy `bagwork.js`'s secret‑check → 200‑fast → dedupe
   shape). On the Oracle, add `campaign_emit.py` + `campaign_backfill_cron.py`. Test the full
   loop with a mock: send, ack, resend‑is‑duplicate, unmatched‑is‑stored‑not‑credited.
4. **XP ledger + caps.** `xpLedger.js` + `award_campaign_xp` RPC (15/20/75). Feed raid events,
   votes, missions through it. `tests/caps.test.js`.
5. **Combined leaderboard + finalizer.** `leaderboard.js`, `finalizer.js`, commit‑and‑reveal
   + Solana‑only fallback. `tests/draw.test.js` reproduces a draw from published inputs.
6. **Buy‑to‑earn + chain indexing.** `chain.js` (approved markets, migration, TWAP, Pyth/
   Switchboard), `positions`, tiers/weights, per‑wallet cap + redistribution.
7. **Allocation + manifests + proposals.** `allocate.js`, `manifest.js` (identical CSV/JSON +
   hash), `proposal.js` (unsigned Squads descriptor). `tests/allocate.test.js`,
   `reconcile.test.js`. **This is the money math — treat like `splitRewards.js`: locked,
   unit‑tested, base‑unit integers only.**
8. **Diamond Duck.** Separate accounting + funding‑pending gate + 250k cap redistribution.
9. **Automation.** `jobs/campaign-tick.js`, `campaign-snapshot.js`; add cron services to
   `render.yaml`; add all new env vars (§15) with `sync:false`.
10. **Dashboard + transparency.** Public dashboard (countdown, cycle, rules hash, source
    status, Squads addresses/balances, XP breakdown, winners, manifests/hashes, reserve
    ledger) vs restricted (raw evidence, device/risk signals, reviewer notes, OAuth tokens).
11. **Readiness gate (§16) + full 25‑profile simulation.** Nothing goes ACTIVE until every
    item is publicly marked passed and both founders sign.

---

## 15. New environment variables

**Project Q** (add to `.env.example` + `render.yaml`, all `sync:false`):

```
CAMPAIGN_ID=bond-the-duck-2026
ORACLE_CAMPAIGN_SECRET=            # shared with Oracle; guards POST /campaign/raid-xp
FAWKQ_DECIMALS=                    # from mint; base-unit math depends on it
NETWORK=devnet                    # devnet for rehearsal · mainnet only at the readiness gate; stamped on every run/manifest/tx
SOLANA_RPC_URL=                   # devnet Helius URL during rehearsals; swap to mainnet for the gate (mirrors jobs/distribute.js)
PYTH_SOLUSD_FEED=
SWITCHBOARD_SOLUSD_FEED=
SQUADS_MULTISIG_ADDRESS=          # public
CYCLE_ACTIVATION_VAULT=           # public
SCHEDULED_DISTRIBUTION_VAULT=     # public
CAMPAIGN_RESERVE_WALLET=          # public
DIAMOND_DUCK_VAULT=               # public
CAMPAIGN_SOL_OPS_WALLET=          # public
CAMPAIGN_DASHBOARD_URL=
# NOTE: no treasury private key here, ever. Project Q cannot sign.
```

**CrabStar Oracle** (add to `.env.example` + `render.yaml`):

```
PROJECTQ_CAMPAIGN_URL=            # https://project-q.onrender.com/campaign/raid-xp
ORACLE_CAMPAIGN_SECRET=           # same value as Project Q's
CAMPAIGN_ID=bond-the-duck-2026
```

Fill the rest via **Appendix B (Deployment Registry)** — every blank is a versioned,
founder‑owned production value, hashed, never overwritten.

---

## 16. Testing & readiness gate (Spec §16)

### Devnet rehearsal first, a small mainnet gate last

Rehearse the **whole lifecycle on devnet**, exactly the way `jobs/distribute.js` de‑risks the
creator‑reward split before mainnet: point `SOLANA_RPC_URL`/`HELIUS_RPC_URL` at devnet, use
`scripts/seed-holders.js` (plus a campaign `seed-participants.js`) to populate the run, trigger
it manually, and watch a full cycle complete cleanly on‑chain. Every run is stamped
`network=devnet` (the column added to `cycles`‑derived runs, `manifests` and
`treasury_transactions`, mirroring `distribution_runs.network`) so a rehearsal can never be
mistaken for — or reconciled against — a real distribution. The finalizer refuses to mix
networks inside one manifest.

**What devnet covers (the bulk of the 25‑profile simulation).** Chain‑agnostic and
standard‑SPL pieces all run identically on devnet:

- All the money math — allocation, per‑wallet cap + redistribution, commit‑and‑reveal draw,
  top‑2 selection, leaderboard, XP caps, reconciliation.
- The distribution engine end‑to‑end against a **test FAWKQ mint with the same decimals**:
  manifest → hashed proposal → approve → execute → confirm → reconcile, including the 3‑retry
  path and the 30‑day‑unresolved state (time‑simulated).
- The **Squads 2‑of‑3 flow**. Squads' program is deployed on devnet, so stand up a real devnet
  multisig and rehearse the *actual human two‑founder approval*. Note the custody difference
  from Project Q: `distribute.js` signs a plain hot wallet itself, whereas Bond the Duck's
  mainnet step is founders clicking approve in Squads — so the thing you practice on devnet is
  that human 2‑of‑3 ceremony, not a script key.
- Wallet‑control challenge (ed25519), enrollment, and the entire Oracle raid webhook loop
  (no chain at all — mock it).
- Pyth/Switchboard have devnet feeds, so the 30‑minute TWAP, the $2 gate, and the
  source‑disagreement/fallback logic are all functionally exercisable — just at devnet price
  values, not mainnet ones.

**What devnet cannot stand in for (why the mainnet gate remains its own item).**

- **The buy‑to‑earn market layer.** Pump.fun's bonding curve and the PumpSwap FAWKQ/SOL pool
  are **mainnet‑only products** — there is no real curve/pool and no real Pump.fun→PumpSwap
  migration on devnet. On devnet you drive the net‑buy indexer from **seeded synthetic
  `swap_events`/`positions`**, which proves the exclusion/tier/weight logic but not the real
  approved‑market reads or migration detection. Those are validated only against mainnet.
- **Real value can't be rehearsed with fake value.** A batch that overpays or double‑pays on
  mainnet is unrecoverable and reputation‑ending for a transparency project — which is exactly
  why the gate keeps a distinct, non‑substitutable **small‑value mainnet transfer test**.

**So, two phases.** (1) *Devnet rehearsal (primary):* the full 25‑profile simulation across all
five cycles, both draw paths reproduced from published inputs, retries and the 30‑day state,
all tagged `network=devnet`. (2) *Mainnet gate (once, at the end):* a dust‑sized real batch
through the real Squads 2‑of‑3 between approved test wallets, **plus** a real read of the live
Pump.fun/PumpSwap market for the buy‑to‑earn indexer — the two things devnet can't reproduce.
Never the 15M; just a real‑path proof.

### Readiness gate — do not go ACTIVE until all pass

15M funding (two 7.5M sigs + exact vault balance) · treasury security (labels, 2‑of‑3, dual
approval, offline recovery tested) · ops funding (0.125 SOL each, 0.25 opening) · mint &
markets verified · prices & finality (Pyth/Switchboard/fallback/TWAP/cutoff) · integrations
(Project Q, **Oracle**, 7 listing sources, 4 TG bots classified) · distribution (wallet
readiness, batch proposal, test transfers, retries, manifests, reconciliation) · transparency
(dashboard, privacy‑safe CSV/JSON, draw reproduction, reserve ledger) · governance/recovery
(appeals, incident pause, backups, restore, comms) · rules & **legal review** published +
hashed. **Full 25‑profile simulation** across all five cycles, top‑2 + three weighted draws
(independently reproduced), Day‑10 $2 snapshot, Pump.fun→PumpSwap migration, oracle fallbacks,
a small‑value **mainnet** transfer test exercising every release %, 3 retries, and the 30‑day
unresolved state. **Zero unexplained reconciliation differences. Both founders sign.**

---

## 17. Acceptance invariants (must stay green — Spec Appendix C)

- Funded == exactly 15,000,000 FAWKQ before activation; Activation+Scheduled == 15,000,000.
- Σ activity ≤ 7.5M; Σ buy‑to‑earn ≤ 7.5M.
- ≤ 5 unique winners/cycle; top‑2 deterministic, exactly 3 draw‑selected.
- Every winner eligible, wallet‑ready, outside cooldown, in the frozen candidate set.
- Every draw reproducible from published data or the fallback.
- Every payment belongs to one manifest version; no `payment_key` executes twice.
- `paid + scheduled + failed/recovery + reserve` reconciles to funded base units, always.
- **No Project Q/Oracle runtime secret can authorize a Squads transfer.**
- No finalization with incomplete verification, stale/conflicting pricing, or unresolved
  integrity incidents.
- Diamond Duck reconciles to exactly 2,500,000 after full funding, separately.
- No reserve movement returns value to a founder or bypasses public dual‑approval.

---

*Build authority only. Production token transfers, Squads execution, wallet/contract
creation, and campaign activation require the approvals and readiness evidence above.*
