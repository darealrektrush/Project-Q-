# Bond the Duck Launch Readiness

Status: pre-launch, fail-closed implementation. All mutation flags remain off.

Project Q evaluates eleven public launch gates across three controlled layers:

1. Campaign foundation: rules, funding, deployment registry, certified sources and the locked schedule.
2. Participation rails: Mini App access, wallet verification and campaign XP settlement.
3. Earn to Burn: approved rules/source/founders/milestones, progress accounting and on-chain verification.

The readiness endpoint exposes only gate labels, pass/fail state, totals and a
SHA-256 report fingerprint. It never exposes wallet addresses, registry values,
evidence URLs, participant identifiers, service credentials or founder IDs.

## Readiness fingerprint

`bond-readiness-v2` hashes the authoritative campaign rules/funding state,
seven cycle boundaries, source classifications, the latest source
certification evidence hashes and validity windows, registry hash, Earn to
Burn configuration and deployment-gate state. Arrays and flag keys are
normalized before hashing, so record ordering does not alter the fingerprint.

Any material evidence or gate change produces a different fingerprint. The
authorized Telegram admin view shows the complete fingerprint so two founder
decisions can reference the exact reviewed state.

## Two-founder approval ledger

The staged approval migration adds exactly two configured campaign founders
and an append-only `APPROVE` / `HOLD` ledger. Decisions are accepted only when:

- the dedicated Render feature flag is explicitly enabled;
- the request comes from an authorized founder in a private Telegram chat;
- the campaign is `SCHEDULED`;
- all eleven readiness gates pass; and
- the decision names the current report version and complete SHA-256 hash.

The latest decision by each enabled founder controls the result. A later
`HOLD` supersedes that founder's earlier `APPROVE`, and any readiness change
creates a new hash that requires fresh decisions from both founders.

The database rejects `SCHEDULED -> ACTIVE` unless the transition evidence
contains the exact versioned report with two current approvals. Recording the
approvals never activates the campaign; activation remains a distinct gated
operation.

The public Mini App remains read-only, and no public route can change campaign
state, record a founder decision, sign a treasury transaction, approve a burn
or execute a distribution.

## Draft provisioning rehearsal

`npm run rehearse:bond-provisioning` validates the reviewed public ruleset and
prints its deterministic hash and remaining founder decisions. It performs no
database writes.

The staged draft-provisioning migration creates only:

- the `bond-the-duck-2026` campaign row in `DRAFT` with zero funding;
- immutable ruleset version 1 with the reviewed draft hash; and
- seven zero-allocation, contiguous 48-hour cycle rows for September 1–15.

It creates no founders, verification sources, registry values, participants,
XP, rewards, approvals, burn records or state transitions. It also refuses to
overwrite a changed campaign or any cycle with evidence.

Draft rules are deliberately not launch-ready. The rules gate remains blocked
until the verified-referral XP amount, official pinned-post ID, X-invite XP
amount and Earn-to-Burn milestone terms are finalized in a new immutable
ruleset version and marked `FINAL`.

## Final-rules governance

Final campaign terms use a separate append-only governance workflow:

1. A configured founder submits a semantically complete next-version ruleset.
2. Project Q calculates and stores its exact deterministic hash.
3. Each of the two configured founders records `APPROVE` or `HOLD` against the
   immutable proposal.
4. Only the latest decision by each founder counts.
5. After two current approvals, an explicit finalization copies the proposal
   into `ruleset_versions` and updates only the campaign's rules version/hash.

Database validation independently locks the dates, nine mission lanes, daily
caps, identity requirements, 15,000,000 FAWKQ campaign pool, 2,500,000 FAWKQ
Diamond Duck bonus, 1 SOL Top Duck prize, separate 15,000,000 FAWKQ creator
wallet burn reserve, release schedule, referral terms, pinned-post identity and
an ordered Earn-to-Burn milestone plan totaling exactly 15,000,000 FAWKQ.

Finalization does not change campaign state, funding, registry values, feature
flags, reward balances or treasury state. A later readiness report still needs
to pass and receive its own two-founder approvals before activation.

## Verification-source certifications

The source gate now requires the exact operating composition—not simply 14
database rows:

- nine registered website-voting sources;
- five registered Telegram bots;
- an accepting registry classification for every source; and
- a latest `HEALTHY` certification for every source that has not expired.

Certifications are append-only, evidence-hash bound and valid for no more than
72 hours. Each record must match the source type and classification in the
registry and must be submitted by an enabled campaign founder through the
server-only RPC. The dedicated certification feature flag defaults to `false`.

The private Telegram admin panel reports composition, freshness and the source
keys needing attention. Evidence URLs and hashes are not rendered. The public
Mini App receives only the single source-gate outcome through the normal
readiness projection.

The certification migration does not register or name any source, seed a
certification, alter campaign state, change funding, or activate participation.
A separate registry migration records the five confirmed bots as
proof-supported and pending certification. A second registry migration records
the nine founder-supplied websites in the same pending state. All fourteen
sources must be independently evidenced before this gate can pass.

The confirmed Telegram set is `@majorbuybot`, `@wtftrending`, `@trenchobot`,
`@BBtrendingbot` and `@drokiatrendsbot`. The first accepted confirmation from
each bot per campaign day awards 2 XP. Later confirmations accepted after that
provider's certified cooldown award 1 XP, up to 20 Trending Bot XP per day.
Every accepted confirmation remains one uncapped Trending Push and appears in
the dedicated ranking even after the XP cap. Browser evidence recorded the
permanent bot IDs as MajorBuyBot `7098195052`, WTF Trending `7812045152`,
Trencho `8094927043`, Bald Buddy `8196088162` and Drokia `8500408157`.
MajorBuyBot's observed cooldown is two hours; WTF Trending, Bald Buddy and
Drokia are one hour; Trencho is 24 hours. These durable source facts do not
replace the short-lived health certification required at launch.

Four providers use a direct FAWKQ success receipt. WTF Trending uses a paired
receipt because its success text is token-generic: Project Q first stores the
forwarded `Vote for Fawk Q` context, then binds the matching success receipt
from the same permanent bot ID and participant. Receipt bodies remain private,
append-only server evidence and never appear in public readiness output.

The founder-supplied website set is GeckoTerminal, Top100Token, CoinMooner,
GemFinder, CoinSniper, CoinMun, CoinBoom, CoinBuzzer and CoinScope. Their exact
FAWKQ destination URLs and source-specific verification profiles are locked
into the draft ruleset and server-only source registry. The August 25 read-only
audit classifies CoinMooner, GemFinder and CoinMun as proof-supported with a
24-hour cooldown, but they remain pending a current healthy certification.
GeckoTerminal is community-progress-only because it exposes no participant
receipt. Top100Token and CoinSniper remain unavailable pending a normal-browser
test. CoinBoom had no visible free vote, while CoinBuzzer and CoinScope were
offline. Those six cannot award individual XP in their current classifications.

Website proofs are private and fail closed. A server-issued attempt lasts 15
minutes, stores only the challenge hash, binds one uploaded proof to its source
and participant, and deduplicates exact image hashes. The original JPEG, PNG or
WebP is limited to 2 MB and stored under a non-guessable object key in the
private `bond-vote-proofs` bucket. Upload and deletion use the server-side
Supabase client; the browser receives neither a storage credential nor a public
evidence URL. The raw challenge may be retained in same-tab session storage for
reload recovery, but only its SHA-256 hash is persisted by Project Q.

An authorized review must approve the source-specific cooldown state before
the generic participation ledger receives an event. The review log is
append-only. Exact replay defense is implemented; perceptual duplicate checks,
OCR/source-state scoring and provider API/webhook adapters are explicitly a
later hardening layer and cannot be treated as active verification.

The private Telegram review queue is also fail closed. Project Q requires the
review feature flag, private-chat context, configured Telegram admin access and
an enabled `campaign_founders` record before retrieving evidence. It downloads
the private object on the server, verifies the stored MIME signature and exact
SHA-256, then uploads the bytes directly to Telegram; no signed Storage URL or
service credential is sent to the reviewer. Database authorization and stale
attempt checks run again inside the existing atomic review RPC.
