# WebSocket Server

This WebSocket server provides real-time communication features for the Twoblade application, such as /chat.

## Environment Variables

The server pulls environment variables from `website/.env`, refer to the main README for instructions on those.

## Running the Server


```bash
cd websocket
bun install
bun run main.ts
```

## Moderation

The server includes basic moderation features:

*   **Profanity filtering:** Messages containing profanity are blocked.
*   **Banning:** Administrators can ban users, preventing them from sending messages.

# Notes
You must have a file `../website/src/lib/server/moderation.ts` that has a function `checkHardcore()`.

For security reasons, this file is proprietary.

Alternatively, you can remove the `checkHardcore()` check in `main.ts`.