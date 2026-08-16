# Project Q Campaign Mini App

Project Q now has a reusable, configuration-driven campaign surface at `/campaign-app/`. The user interface is shared across campaigns; campaign-specific copy, missions, limits, eligibility rules, reward schedules, and lifecycle controls live in JSON.

## Lifecycle controls

Each campaign is registered in `public/campaign-app/campaigns/index.json`.

- `visible: true` makes the campaign addressable from the app.
- `enabled: true` marks participation as open. Keep this false until launch readiness is approved.
- `archived: true` makes the campaign a read-only historical record.
- `visible: false` removes a campaign from participant navigation without deleting its records.

Never delete participant, XP, eligibility, allocation, or receipt records when retiring a campaign. Archive the campaign and remove it from navigation instead.

## Add a future campaign

1. Copy `bond-the-duck-2026.json` to a new uniquely named JSON file.
2. Give it a permanent campaign `id` and update its content and rules.
3. Add a registry entry in `index.json` with `enabled: false`.
4. Open `/campaign-app/?campaign=<campaign-id>` and complete QA.
5. Enable it only after identity, mission-source, treasury, and public-readiness checks pass.

## Telegram entry point

Set `PROJECT_Q_CAMPAIGN_APP_URL` on the Project Q service to the public HTTPS URL, for example:

`https://<project-q-service>/campaign-app/`

When configured, the Bond the Duck bot menu adds an **Open Campaign App** button. The existing bot menus remain available as the fallback and notification layer.

## Security boundary

The current browser milestone is a read-only/pre-launch shell. Client-provided Telegram data, X status, and wallet addresses must never be trusted directly. Before enabling participation, the backend must:

1. verify Telegram Mini App `initData` on the server;
2. resolve the Telegram account to one Oracle-verified permanent X user ID;
3. verify wallet ownership with a short-lived nonce and signed message;
4. enforce one Telegram account, one X identity, and one wallet using database constraints and RLS;
5. calculate XP, eligibility, ranks, and allocations server-side.

No token transfer or claim authority belongs in the Mini App.
