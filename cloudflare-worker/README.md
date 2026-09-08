# DarkianMail inbound via Cloudflare Email Routing + Tunnel

Since Cloudflare tunnels don't carry inbound SMTP port 25, this worker turns
Cloudflare Email Routing into an HTTP webhook that your server accepts over the
tunnel. Your SMTP server no longer needs to be reachable from the internet.

> Local state is already done: `.env` = `DOMAIN_NAME=darkian.xyz`, webhook on
> `127.0.0.1:8080` with a token, web app rebuilt with `PUBLIC_DOMAIN=darkian.xyz`,
> users/emails migrated, inbound webhook + local delivery verified.

Flow:

    sender MTA --> Cloudflare MX (port 25) --> Email Routing
        --> this Worker (email handler)
        --> POST https://mail.darkian.xyz/inbound   (through cloudflared tunnel)
        --> DarkianMail webhook server (127.0.0.1:8080)
        --> stored/classified in Postgres, attachments in MinIO

## Remaining steps (need your Cloudflare login)

1. Add `darkian.xyz` to your Cloudflare account and let it take over DNS
   (nameservers). Keep `mail.darkian.xyz` on the free plan so the tunnel works.

2. Deploy the worker (token already set in `wrangler.toml`):

       cd cloudflare-worker && npx wrangler deploy

   (or paste `worker.js` into Dashboard -> Workers & Pages, set
   `INGEST_URL=https://mail.darkian.xyz/inbound` and `INGEST_TOKEN` = the value
   of `SMTP_WEBHOOK_TOKEN` in the root `.env`.)

3. Cloudflare Dashboard -> your domain -> Email Routing -> enable
   (it auto-adds the Cloudflare MX + SPF records), then Routing Rules:
   catch-all `*` -> Action: "Send to a Worker" -> this worker.

4. Create the tunnel and start it:

       cloudflared tunnel login
       cloudflared tunnel create darkianmail
       cp cloudflare-worker/cloudflared-config.example.yml ~/.cloudflared/config.yml
       cloudflared tunnel route dns darkianmail mail.darkian.xyz
       cloudflared tunnel run darkianmail

   Optionally route the web UI too: `cloudflared tunnel route dns darkianmail darkianmail.darkian.xyz`
   with a second ingress entry `-> http://127.0.0.1:4173`.

5. For long-running processes use the systemd units in `systemd/`.

## Outbound sending (your home IP can't direct-MX)

Set the relay in the root `.env` (uncomment + fill) — e.g. SMTP2Go free tier,
SendGrid, or Brevo. Give the provider `darkian.xyz` as your sending domain so it
adds SPF/DKIM. Then restart the mail server:

       SOMETHING="{host} {user} {port} {secure}"  # per your provider
       sudo systemctl restart darkianmail-mail   # or restart manually

## Test

    curl -X POST http://127.0.0.1:8080/inbound \
      -H "Authorization: Bearer <token>" \
      -H "Content-Type: message/rfc822" \
      -H "X-Envelope-To: alice@darkian.xyz" \
      --data-binary @msg.eml

then send a real email to alice@darkian.xyz from Gmail and check the web UI.

## Security notes

- Webhook binds to 127.0.0.1 by default; only the tunnel exposes it.
- A `Bearer` token is required unless `SMTP_WEBHOOK_TOKEN` is left empty (dev).
- `message.from` / `message.to` from Cloudflare are trusted as the envelope,
  and the server still verifies the recipient is a real local user.