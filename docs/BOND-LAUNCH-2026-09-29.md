# Bond the Duck — September 29 launch handoff

Founder-provided target, recorded September 26, 2026. This is a launch target, not an activation or treasury approval. Do not publish a final readiness claim until all gates pass.

## Schedule (America/Vancouver)

| Event | Vancouver local time | UTC |
| --- | --- | --- |
| Official FAWKQ campaign post | September 28; publication time pending | Post ID pending |
| Active opens, cycle 1 | September 29, 2026, 8:00 AM PDT | 2026-09-29T15:00:00Z |
| Cycle 2 opens | October 1, 8:00 AM PDT | 2026-10-01T15:00:00Z |
| Cycle 3 opens | October 3, 8:00 AM PDT | 2026-10-03T15:00:00Z |
| Cycle 4 opens | October 5, 8:00 AM PDT | 2026-10-05T15:00:00Z |
| Cycle 5 opens | October 7, 8:00 AM PDT | 2026-10-07T15:00:00Z |
| Active closes | October 9, 8:00 AM PDT | 2026-10-09T15:00:00Z |
| Review opens after handoff | October 10, 8:00 AM PDT | 2026-10-10T15:00:00Z |
| Review checkpoint, 48 hours later | October 12, 8:00 AM PDT | 2026-10-12T15:00:00Z |
| Review closes, 72 hours later | October 13, 8:00 AM PDT | 2026-10-13T15:00:00Z |

September 29 is daylight saving time in British Columbia: 8:00 AM local is **PDT (UTC−7)**, although the founder called it “PST.” The final rules packet derives these times from `2026-09-29T15:00:00Z`. The draft schedule records the target while its status stays `DRAFT` and its official X post ID stays unset.

## Funding destinations and verification

- Founder-provided Ocean Conservation vault destination: `J9J6MsSxicqmwTuzJGHitVUuUhRwP4iaDdTRgMAUDj4p`. Mainnet read-only lookup found an existing System Program account. Its ownership or governance as *the intended conservation vault* still needs founder confirmation before a binding proposal.
- Founder plans to deposit **1.1 SOL** into the same Squads vault that controls the campaign's FAWKQ. Its **native SOL vault address** is `3z6YpKpgDrUdRuqp1KkJfVhw5X3BRGQzUZhGN8VMNfci` (derived from 2-of-3 Squads multisig `9xTq2tfgGWimdk3wEgZ6dQxnV98baEysotxwapsBDwUf`, vault index 0). Its separate **FAWKQ Token-2022 account**, `F5pyRANAC1PCY9Jc8GTXDxFt3oncBvPBGwtBFGfXQ9vr`, holds 40 million FAWKQ. Do not use the token account or the multisig configuration address as the SOL recipient. Confirm the destination in Squads before signing a transfer.
- Read-only finalized mainnet audit at slot `450523697`: vault FAWKQ balance 40,000,000; vault native SOL balance 0.001. The creator token account held 24,027,568.759381 FAWKQ. These are capacities and balances, not campaign commitments.
- The 1.1 SOL obligation is **1 SOL prize plus 0.1 SOL conservation contribution**, separately from network and Squads transaction fees. If those fees are paid from this vault, fund a small additional fee buffer so the commitment remains spendable; recheck the balance after deposit.
- Before recording funding, obtain a fresh, durable HTTPS evidence record and SHA-256 of the verified vault balance and destination, record the verification time (fresh for 72 hours), and submit the exact 17,500,000 FAWKQ commitment to the two configured founders. The application funding ledger remains zero until the exact proposal is approved and finalized. Wallet signing and actual transfers remain separate.

## Remaining dependencies

1. Publish the official campaign X post September 28 and supply its numeric post ID. Only then can the `FINAL` v4 rules JSON and hash be prepared and presented to both founders for exact approval.
2. Confirm the Ocean Conservation address under the team's control, deposit sufficient SOL to the Squads native SOL vault, and capture fresh funding evidence. Do not infer campaign allocation or founder approval from a balance alone.
3. Complete registry, verification-source certification, five draw precommitments, Earn to Burn provisioning, controlled feature flags, and the rehearsal/readiness report before activation. If any gate is blocked, revise the launch target and generate a new exact rules hash rather than silently opening late.
