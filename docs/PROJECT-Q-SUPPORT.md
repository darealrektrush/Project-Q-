# Private support — Dev v1

Participants open Account menu → Help Centre → My requests. Signed Telegram init data is validated on every read and write; Oracle supplies the profile ID. Requests are private, with categories, a subject, messages and waiting-team / team-replied status. Participants refresh conversations to see replies. No automatic DM, online presence, attachments or reward/identity changes occur.

The feature is restricted to the project-q-dev Render service and its existing isolated database guard. Production remains disabled.

## Team workflow

Only configured TELEGRAM_ADMIN_USER_IDS may use these commands, in a private conversation with Project Q Dev:

- `/qsupport` lists the latest ten open request IDs and categories.
- `/qsupportread THREAD_ID` shows the last five messages (bounded to Telegram length).
- `/qsupportreply THREAD_ID message` saves a team reply inside the participant's conversation.

Commands do not forward participant content into a group. The deployment does not send any messages or change the configured admin list. Team response time depends on staffing; the app makes no instant-response promise.

## Data and limits

Server-only tables have RLS enabled and public/anonymous/authenticated grants revoked. Only service-role calls can reach the invoker RPC. HTTP ownership comes from verified identity, never from the request body. The RPC serializes participant writes, permits five new requests per day and five participant messages per minute, and bounds conversations at 200 messages. Client message UUIDs make retries idempotent. The client escapes message content and does not attach wallet balances or diagnostics. Subjects and messages remain private support data.

Database rehearsal ran in a transaction and rolled back: request creation, idempotent replay, cross-profile rejection and team response status passed. Automated tests cover input validation, Dev gating, ownership-before-message-read and rejected client role injection. Signed-in Telegram tester submission and team command rehearsal remain part of release testing.

Follow-up: resolving requests, pagination beyond the latest 30 requests, unread notifications, optional reviewed attachments and account-wide notification preferences. No claim of production readiness or universal-profile changes.
