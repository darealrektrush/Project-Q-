# Bond the Duck — October 5 launch target handoff

Founder-revised target, recorded September 30 Vancouver time. This is a launch target, not an activation or treasury approval. Do not publish a final readiness claim until all gates pass.

## Target schedule

| Milestone | Vancouver time | UTC |
|---|---|---|
| Official FAWKQ campaign post | Post ID pending; verify whether a new post is needed | — |
| Active opens, cycle 1 | October 5, 2026, 9:00 AM PDT | 2026-10-05T16:00:00Z |
| Cycle 2 opens | October 7, 9:00 AM PDT | 2026-10-07T16:00:00Z |
| Cycle 3 opens | October 9, 9:00 AM PDT | 2026-10-09T16:00:00Z |
| Cycle 4 opens | October 11, 9:00 AM PDT | 2026-10-11T16:00:00Z |
| Cycle 5 opens | October 13, 9:00 AM PDT | 2026-10-13T16:00:00Z |
| Active closes | October 15, 9:00 AM PDT | 2026-10-15T16:00:00Z |
| Review opens after handoff | October 16, 9:00 AM PDT | 2026-10-16T16:00:00Z |
| Review checkpoint, 48 hours later | October 18, 9:00 AM PDT | 2026-10-18T16:00:00Z |
| Review closes, 72 hours later | October 19, 9:00 AM PDT | 2026-10-19T16:00:00Z |

October 5 is still daylight saving time in British Columbia, so 9:00 AM Vancouver time is **PDT (UTC−7)**, despite the shorthand “PST.” The draft rules record the target as `2026-10-05T16:00:00Z`; their status stays `DRAFT`, and the official X post ID stays unset until verified.

## Funding destinations and verification

- Founder-confirmed CrabStar Ocean Conservation Squads vault destination: `J9J6MsSxicqmwTuzJGHitVUuUhRwP4iaDdTRgMAUDj4p` (confirmed September 29). A read-only Solscan check on September 29 identified it as a Squads V4 vault PDA under multisig account `F2QFXHz75iL1MpuzsATMxhQ9MSf4aSbe8i66PsyQ8zeS` with a 2-of-3 approval threshold. The wallet is separate from the Bond the Duck reward vault below. Recheck the multisig configuration, exact recipient and token-specific accounts with fresh chain evidence before any new transfer or binding funding proposal; this confirmation does not itself satisfy the launch funding gate.
- Founder confirmed the **native SOL vault address** is `3z6YpKpgDrUdRuqp1KkJfVhw5X3BRGQzUZhGN8VMNfci` (derived from 2-of-3 Squads multisig `9xTq2tfgGWimdk3wEgZ6dQxnV98baEysotxwapsBDwUf`, vault index 0). A deposit of **1.1 SOL** had been planned for September 28, but the current funding transaction and balance still require fresh verification before the campaign can be funded. Its separate **FAWKQ Token-2022 account**, `F5pyRANAC1PCY9Jc8GTXDxFt3oncBvPBGwtBFGfXQ9vr`, holds 40 million FAWKQ. Do not use the token account or the multisig configuration address as the SOL recipient. Recheck the destination in Squads before signing a transfer.
- Read-only finalized mainnet audit at slot `450523697`: vault FAWKQ balance 40,000,000; vault native SOL balance 0.001. The creator token account held 24,027,568.759381 FAWKQ. These are capacities and balances, not campaign commitments.
- The 1.1 SOL obligation is **1 SOL prize plus 0.1 SOL conservation contribution**, separately from network and Squads transaction fees. If those fees are paid from this vault, fund a small additional fee buffer so the commitment remains spendable; recheck the balance after deposit.
- Before recording funding, obtain a fresh, durable HTTPS evidence record and SHA-256 of the verified vault balance and destination, record the verification time (fresh for 72 hours), and submit the exact 17,500,000 FAWKQ commitment to the two configured founders. The application funding ledger remains zero until the exact proposal is approved and finalized. Wallet signing and actual transfers remain separate.

## Remaining dependencies

1. Before the October 5 target: collect current operational evidence for **all 14** registered sources. Three proof-supported sites (CoinMooner, CoinMun and GemFinder) and all five Telegram bots must be healthy. Classify the other six sites truthfully, including unavailable and community-only sources. The founder-submitted full certification packet requires 14 HTTPS evidence records with SHA-256 hashes and lasts no longer than 72 hours; submit only within the launch window. Arrange the three-person staging beta and close critical defects.
2. Before any final rules are approved: verify the official campaign X post and supply its numeric post ID. Prepare the `FINAL` v4 rules and exact hash, then have both configured founders independently approve and finalize that proposal. Funding happens separately: the founder transfers the planned SOL, supplies its finalized transaction signature, and the team verifies the Squads balance, 17.5 million FAWKQ capacity, conservation address, and fresh durable evidence before a separate funding proposal receives two approvals. Do not infer allocation or approval from a balance alone.
3. After the finalized rules: replace the seven expired draft cycles with the final five only through the guarded scheduling RPC; complete the registry, source certifications, five private-backed public draw commitments, Earn to Burn provisioning, controlled feature flags, full isolated Devnet release rehearsal, and production readiness report. Two founders must approve the exact passing readiness fingerprint before the distinct activation step.
4. October 5 target: if any gate remains blocked or the scheduled opening passes, keep participation closed, revise the launch target, and generate a new exact rules hash. Public copy must describe the opening as a **target subject to final verification** until gates pass.
