# Project Q Premium UX Audit — 2026-10-02

## Objective

Move Project Q from a polished crypto/campaign dashboard to a premium consumer product without changing its underlying campaign, identity, settlement, or verification architecture.

The product should answer four questions in the first viewport:

1. Who am I?
2. Am I ready?
3. What do I do next?
4. What operation am I in?

Anything else is progressive disclosure.

## Locked product language

Project Q is the participant-facing campaign experience.

Oracle remains the canonical identity, X verification, wallet ownership, Crab Army lifetime XP/rank, and ecosystem reputation authority.

The UI must never turn backend checks into extra user chores.

For Bond the Duck the user has two active setup actions:

- Connect X
- Verify wallet

Telegram identity, FAWKQ token-account presence, and the minimum holding check are automatic state.

## Design system

### Surface hierarchy

Only three visual surface levels are allowed:

1. Warm ivory page/background.
2. Quiet cream/white functional surfaces.
3. Midnight navy premium anchors for identity, campaign, records, and major status.

Gold is scarce and signals campaign importance or a primary campaign action.

Oracle cyan signals identity, verification, connectivity, and progress.

### Typography

Use the condensed Project Q face for:
- PROJECT Q // labels
- operation IDs
- rank/XP labels
- campaign language
- status language

Use the neutral UI sans for:
- descriptions
- buttons
- help/recovery copy
- form controls
- functional instructions

### Chrome

Hierarchy comes from spacing, surface tone, typography, and restrained elevation.

Do not put borders around every parent, child card, button, chip, and metric.

### Motion

Use short 120–180ms feedback for:
- tab selection
- verified-state changes
- button press
- card settling
- progress movement

Respect prefers-reduced-motion.

No decorative animation may delay a user action.

## Full-app audit

### Shell / header

Previous issue:
- Telegram supplies its own top chrome and Project Q added another tall header.
- notification, profile and menu controls consumed excessive horizontal space.

Premium direction:
- compact Project Q app bar
- icon-only mobile account actions
- strong but quiet identity
- no duplicated account text on narrow screens

### Bottom navigation

Previous issue:
- large gold active-tab tile
- permanent PROJECT Q // THE ECONOMIC ENGINE marketing footer
- too much mobile viewport consumed by chrome

Premium direction:
- shallow navigation dock
- no persistent marketing footer on mobile
- restrained gold active indicator
- content owns the viewport

### Terminal

Keep:
- Bond the Duck hero art
- operation summary
- one obvious next action
- Ocean Impact anchor

Improve:
- compact Next Step strip
- low-chrome snapshot metrics
- no automatic eligibility check presented as a user task
- direct Connect X / Verify Wallet from Terminal when those are the next action

### Operations

Previous issue:
- dossier, tabs, status, clearance, rules, economics and missions each used separate card treatments

Premium direction:
- campaign art is the premium anchor
- quiet segmented tabs
- one operation-content surface
- mission files use subtle elevation and state accent rather than full borders
- Operation Access uses READY / X+Wallet framing instead of 1/5 clearance language
- detailed rules/economics remain progressive disclosure

### Mission Files

Previous issue:
- modal could regress into dashboard/card density
- clearance repeated all five backend checks

Premium direction:
- current order is the visual anchor
- source/recovery information is secondary
- mission access says Connect X / Verify Wallet / Automatic checks pending
- full five-check backend state is never presented as five participant tasks

### Record

Keep:
- dark permanent-record anchor
- XP / Standing / Achievements hierarchy

Improve:
- smaller header
- quiet tabs
- borderless functional panels
- campaign XP remains visually distinct from Oracle lifetime Crab Army XP

### Achievements

Keep:
- collectible-object direction
- cinematic detail
- verified history
- collection/rarity architecture

Improve:
- less chrome around collection/deck surfaces
- preserve artwork prominence
- keep locked/in-progress/verified states truthful
- never invent future badge criteria

### Rewards

Previous issue:
- strong information model but too much dashboard framing

Premium direction:
- compact dark reward anchor
- pipeline remains collapsed by default
- summary amounts use quiet cards
- destination and receipts stay evidence-first
- Scheduled, Released, and Confirmed remain distinct

### Profile

Previous issue:
- Universal Profile dominated the screen
- full Campaign Passport duplicated Record, Rewards, and Achievements
- setup looked like a five-row settings checklist

Premium direction:
- compact Oracle Universal Profile identity object
- human-readable handle/name; internal profile UUID is backend-only
- actual Crab Army rank/insignia + lifetime XP + next-rank progress
- 2–3 verified recognition chips
- small stat rail
- Verification Center directly below
- one compact current-operation card
- detailed campaign record stays in Record/Operations/Rewards

### Verification Center

Locked UX:
- 0/2, 1/2, 2/2 participant actions
- Connect X
- Verify Wallet
- Telegram, FAWKQ account, and minimum holding appear only as automatic checks
- when X and wallet complete, primary action area collapses
- when every authoritative check completes, center collapses to READY

### Wallet verification

Previous issue:
- Phantom-biased
- text-only grid
- external/Render/server implementation detail visible to users

Premium direction:
- Wallet Standard discovery first
- detected wallet shown first with its supplied icon
- recommended branded choices: Phantom, Solflare, Backpack
- More Wallets: Jupiter, MetaMask, Other Solana Wallet
- one compact trust footer:
  - Signature only
  - 0 SOL
  - No transaction
  - Never share seed phrase/private key
- Project Q prepares fallback session before wallet handoff
- backend/Render cold-start pages are not user-facing product UI

### Notifications / account / support

Premium direction:
- one drawer language
- Back means back
- support/recovery is advanced/fallback tooling
- recovery is never part of first-time onboarding
- identity sync is a quiet informational state, not a red error banner

### Onboarding

Premium direction:
- short guided orientation
- explain only what the user needs for the current screen
- tour must not compete with real CTAs
- replay remains available from Profile

### Readiness

Readiness is an audit/operator surface and may remain denser than consumer screens.

Even there:
- blockers should be explicit
- no vague readiness percentage as a substitute for actions
- funding, source, schedule, burn and settlement gates remain separate
- no production state is inferred from Dev readiness

## Implementation status

Implemented in Premium V4:
- global premium design tokens
- compact mobile header
- lightweight mobile dock
- persistent mobile marketing footer removed
- restrained active-tab indicator
- three-surface hierarchy
- functional sans typography
- reduced borders across primary surfaces
- premium Terminal refinements
- Operations / Mission File refinements
- Record refinements
- Rewards refinements
- Achievement chrome reduction
- compact Oracle Universal Profile
- two-action Verification Center
- compact Profile current-operation card
- branded multi-wallet picker
- quiet identity-sync state
- premium dialogs/drawers/tour/readiness surfaces
- direct verification CTAs from Terminal
- Operation Access language across Terminal / Operations / Mission Files

## QA contract

Before this pass is considered complete:

- CI green
- Bond campaign safety green
- Dev deploy live
- no horizontal overflow on iPhone/Android
- header and bottom dock do not obscure content
- first viewport makes identity/access/next action/current operation obvious
- X and wallet start from Project Q
- no bot command required for normal onboarding
- no Render/server page exposed to participants
- wallet chooser shows branded providers
- Profile UUID never shown
- campaign XP and lifetime Crab Army XP never conflated
- automatic checks are not rendered as separate participant actions
- production remains untouched
