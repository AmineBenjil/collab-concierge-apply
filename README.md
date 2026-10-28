# Collab Concierge: creator link

The page creators open from a business's DM to request a collab. Phone first; on a laptop it sits as a centred card.
It's the Collab Concierge creator flow with nothing pre-filled: socials, the collab, payment, three Instagram Insights screenshots, location, contact, anything else, then a thank-you screen whose button follows the business on Instagram.

## Deploy

The Vercel project is linked to this repo: every push to `main` deploys to https://collab-concierge-apply.vercel.app.

## Run

```bash
npm install
npm run dev   # http://localhost:3100
```

## Point it at a business

Edit `src/business.ts` (handle, name, welcome and thank-you DMs) and replace `public/img/business/avatar.jpg` and `cover.png`.

## Where requests go

Set `APPLY_WEBHOOK_URL` (see `.env.example`). Each request is POSTed there as JSON with the answers and the three screenshots as JPEG data URLs.
In local dev without it, requests are saved to `.submissions/`. A deployment without it only writes the answers to the server logs (no screenshots), so set it before sending the link to real creators.

## Fonts

The headline font, National 2 Narrow, is licensed, so its files aren't in this repo. `/fonts/*` is proxied to benable.com (see `next.config.ts`); local copies in `public/fonts/` take priority if you have them.
