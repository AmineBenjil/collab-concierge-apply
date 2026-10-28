# Collab Concierge: creator link

The page creators open from a business's DM to request a collab. Phone first; on a laptop it sits as a centred card.
It's the Collab Concierge creator flow with nothing pre-filled: socials, the collab, payment, three Instagram Insights screenshots, location, contact, anything else, then a thank-you screen whose button follows the business on Instagram.

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

The headline font, National 2 Narrow, is licensed, so its files aren't in this repo. Put `National2Narrow-{Regular,Medium,Bold,Extrabold}.otf` in `public/fonts/` to use it; without them the page falls back to Arial Narrow.
