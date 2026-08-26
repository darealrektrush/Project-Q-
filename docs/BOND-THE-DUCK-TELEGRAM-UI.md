# Bond the Duck — Project Q Telegram UI and Button Map

Status: pre-launch implementation contract. This map defines navigation and
permissions; it does not activate the campaign or authorize treasury actions.

## Public navigation

`/start` → `🦆 Campaigns` → `🦆 Bond the Duck`

| Screen | Callback | Purpose | Pre-launch behavior |
|---|---|---|---|
| Campaigns | `menu:campaigns` | Lists Project Q campaigns | Shows Bond the Duck |
| Bond the Duck | `menu:campaign:bond` | Campaign home, countdown and state | Shows `DRAFT / pre-launch` |
| Overview | `menu:campaign:bond:overview` | Schedule, pools and current state | Read-only summary |
| Enroll / Wallet | `menu:campaign:bond:enroll` | Identity and wallet-readiness flow | Enrollment closed |
| My Status | `menu:campaign:bond:status` | Eligibility, readiness, rank and deadline | Not launched |
| My XP | `menu:campaign:bond:xp` | Verified/pending/rejected XP and cap usage | No XP awarded |
| Leaderboard | `menu:campaign:bond:leaderboard` | Current cycle and campaign standings | No active cycle |
| Missions & Voting | `menu:campaign:bond:missions` | Missions, nine sites and five Telegram bots | Sources disabled |
| Oracle Raids | `menu:campaign:bond:missions:raids` | Oracle-launched X raids, verification and campaign credit | Read-only history; sources disabled |
| Buy-to-Earn | `menu:campaign:bond:buy` | Net-buy tier and eligibility status | Tracking inactive |
| Cycle Results | `menu:campaign:bond:cycles` | Snapshots, public draw and winners | No results |
| Rewards | `menu:campaign:bond:rewards` | Allocations and release schedule | No allocation |
| Rules | `menu:campaign:bond:rules` | Published rules and eligibility | Draft notice |
| Treasury & Receipts | `menu:campaign:bond:treasury` | Vaults, manifests, proposals and txs | Not activated |

The `/campaign` command opens the Bond the Duck hub directly. Every leaf screen
returns to the hub. The hub returns to Campaigns. Returning to `/start` sends a
fresh home message so media-based home menus remain valid in Telegram.

## Locked campaign schedule

All operational timestamps use `America/Vancouver` for display and UTC in the
database. The active campaign opens September 1, 2026 at 8:00 AM PT and closes
September 15, 2026 at 8:00 AM PT: exactly 14 days divided into seven contiguous
48-hour activity cycles. September 15–16 is the campaign-close handoff before
the final review window.

Final verification and review opens September 16 at 8:00 AM PT. September 18
at 8:00 AM PT is the 48-hour clearance checkpoint; September 19 at 8:00 AM PT
is the 72-hour maximum. The 50% post-review release becomes eligible only when
final review clears: September 18 when cleared at the checkpoint, otherwise
immediately upon clearance no later than September 19.

The recurring 25% verified-activity release remains attached to each completed
48-hour cycle. The final 25% remains five 5% installments at 6, 12, 18, 24 and
30 days after the actual post-review release.

The public Mini App runtime uses server time and reports the current calendar
phase, cycle and next boundary. Calendar time never activates participation by
itself: the interface shows `LAUNCH BLOCKED` unless the locked schedule is in an
active cycle, the authoritative campaign database state is `ACTIVE`, and the
deployment participation gate is explicitly enabled. All seven Supabase cycle
rows must also match the locked boundaries exactly.
The client refreshes the authoritative runtime each minute and only animates
the intervening countdown locally.

The Mini App readiness percentage is calculated from the same eleven launch
checks used by Project Q administration. The public projection exposes only a
whitelisted check key, human-readable label and boolean result. Registry
values, evidence URLs, wallet addresses, founder identifiers and deployment
credentials are never included. If the readiness service fails, the interface
shows an unavailable state instead of retaining or inventing a percentage.

## Participant flows

### Enrollment and wallet readiness

`Enroll` → accept versioned rules/privacy notice → confirm linked X identity →
enter reward wallet → receive single-use 10-minute challenge → submit signature
→ verify existing FAWKQ token account → show readiness result.

The interface must never request a seed phrase or private key and must never
create or subsidize an associated token account.

### Mission centre

Each card shows XP, requirements, deadline, verification class, state and one
action. States: `AVAILABLE`, `ACTIVE`, `SUBMITTED`, `PENDING_EVIDENCE`,
`VERIFIED`, `REJECTED`, `EXPIRED`, `SOURCE_UNAVAILABLE`.

The mission centre is divided into Oracle Raids, Website Voting, Telegram
Trending Bots, Other Missions and My Mission Progress. Oracle remains the raid
launcher and X-engagement verifier. Project Q reads verified Oracle events into
`campaign_raid_events`, applies campaign XP rules through `xp_ledger`, and shows
the participant's credited, pending and rejected raid actions.


### Oracle raid event bridge

Oracle sends each positively verified X action to
`POST /oracle/campaign-raid-event` with the shared
`x-oracle-campaign-secret` header. The Project Q endpoint accepts only canonical
raid actions and calls one database function that checks the active campaign,
the participant's verified Telegram/X identity, the matching cycle and replay
idempotency.

An accepted event is stored with `credited=false`; receipt is not an XP award.
The separate campaign settlement pipeline applies the campaign's daily caps and
writes any award to `xp_ledger`. Oracle failures never grant campaign XP, and a
Project Q outage never rolls back Oracle's own proof or XP.

Keep the bridge disabled until the migration and endpoint are deployed, both
services have the same dedicated bridge secret, and the campaign activation
gate has passed. Neither service may receive the other service's Supabase
service-role key.

### Vote & Trend

Website flow: Project Q creates a 15-minute nonce-bound attempt → opens the
exact registered FAWKQ page → participant votes → participant returns with a
post-vote/cooldown screenshot → Project Q hashes and deduplicates the evidence
→ source-specific review approves or rejects it. Opening a page never awards
XP. Public vote-counter movement is corroboration only, never identity proof.
The participant uploads an original JPEG, PNG or WebP up to 2 MB into a private
Supabase Storage bucket through the Project Q server; the browser never receives
storage credentials or a public evidence URL. The raw challenge exists only in
the participant's tab session and the submission RPC checks the signed Telegram
identity, attempt ownership, challenge hash, expiry and exact image hash. A
valid attempt may finish during the review phase if its 15-minute timer began
while participation was active.

Telegram bot flow: open one of five registered bots → vote for FAWKQ → privately
forward the original completion receipt to Project Q within ten minutes →
validate the permanent numeric bot origin, FAWKQ context, time, global replay
hash, current health certification and provider cooldown → award 2 XP for that
bot's first Vancouver campaign-day vote or 1 XP for a later verified vote.
WTF Trending is the one paired flow: the participant forwards its FAWKQ context
message first, then its token-generic success message within five minutes.
Trending-bot XP has a dedicated 20 XP daily cap. Every accepted receipt remains
one Trending Push after the cap; website voting stays inside the separate 15 XP
participation bucket.

The registered website set is GeckoTerminal, Top100Token, CoinMooner,
GemFinder, CoinSniper, CoinMun, CoinBoom, CoinBuzzer and CoinScope. The August
25 read-only audit found a usable 24-hour screenshot-review path on CoinMooner,
GemFinder and CoinMun. GeckoTerminal is aggregate community progress only.
Top100Token and CoinSniper require a normal-browser live test; CoinBoom had no
visible free vote; CoinBuzzer and CoinScope were unavailable. Only sources with
an individual-verification classification and a current healthy certification
can accept participant evidence or award XP.

This is the strongest provider-independent fallback, not machine proof of a
vote. Exact-hash replay protection is active. Perceptual duplicate detection,
OCR/source-state scoring and provider API/webhook adapters remain separate
hardening steps; they must not be represented as active until deployed and
certified.

Authorized website reviews run only in a configured founder's private Project
Q chat while the dedicated review flag is enabled. The queue is oldest-first,
paginates ten proofs at a time and renders only a deterministic participant
pseudonym. When a founder opens an item, Project Q downloads the private object
server-side, validates its MIME signature, recomputes SHA-256 and refuses to
show altered evidence. Approvals use one fixed auditable reason; rejections use
one of five explicit categories: unclear proof, wrong source, unverifiable
timing, duplicate/inconsistent evidence or privacy-safe resubmission. The
database independently rechecks campaign-founder authorization and attempt
state before its append-only RPC records the decision.

### Rewards and appeals

Rewards show preliminary/final eligibility, gross base units, manifest version,
recurring 25% verified-activity releases, the 50% post-review release and five
final 5% installments. They also show payment signatures and recovery state.
Rejections expose a privacy-safe reason, evidence deadline, resubmission action
and appeal state.

## Permission boundaries

| Role | Allowed | Prohibited |
|---|---|---|
| Participant | Own identity, XP, evidence, eligibility, rewards and appeals | Other participants' private data; administrative decisions |
| Public | Rules hash, anonymized leaderboard, winners, manifests, vaults, txs and reconciliation | Raw evidence, device/risk signals, OAuth data, reviewer notes |
| Reviewer | Assigned evidence queue, verdicts, evidence requests and audit history | Campaign state changes, allocations, proposals or payments |
| Operator | Source health, jobs, incidents and approved operational actions | Founder approvals or treasury signing |
| Founder | Readiness approvals, pause/resume, manifest approval and proposal status | Unilateral activation, allocation change or payment |
| System | Verify, calculate, publish and build unsigned proposal descriptors | Hold a signer or execute a treasury transfer |

Reviewer and founder controls must live behind the existing Project Q admin
authorization checks. They must not be reachable merely by knowing a callback
string. Every decision is audit-logged and corrections append a new version.

## Administrative callback namespace

Reserved for later authenticated implementation:

- `admin:campaign:review:*` — evidence queue and verdict actions
- `admin:campaign:source:*` — source health and classification
- `admin:campaign:cycle:*` — freeze/finalize controls with readiness checks
- `admin:campaign:incident:*` — pause workflow
- `admin:campaign:manifest:*` — review and founder approval record
- `admin:campaign:proposal:*` — unsigned Squads proposal status only

No callback may sign, approve on-chain, or execute a Squads transaction.

## Implementation gates

1. Menu skeleton may deploy while the campaign is `DRAFT`.
2. Personalized screens remain closed until schema, identity and RLS checks pass.
3. XP and voting actions remain disabled until certified sources and atomic caps pass devnet tests.
4. Leaderboard/results remain disabled until snapshot and draw reproduction tests pass.
5. Rewards remain read-only until manifests reconcile with zero unexplained difference.
6. `ACTIVE` requires the complete public readiness report and both founders.
