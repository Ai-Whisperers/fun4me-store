# ⚠️ THIS REPO IS NOT THE LIVE WEBSITE

**As of 2026-04-09, the live Fun4Me Store website is hosted inside the Paragu-AI (formerly Vete) multi-tenant platform.**

## Where to find the live site

- **Live URL:** https://paragu-ai.com/fun4me
- **Tenant config:** [Ai-Whisperers/Vete/web/.content_data/fun4me/](https://github.com/Ai-Whisperers/Vete/tree/main/web/.content_data/fun4me)
- **Deploy:** Docker Swarm on agentzero VPS, Traefik → paragu-ai.com

## Where to make changes

| Change type                         | Where                                              |
|-------------------------------------|----------------------------------------------------|
| Content (copy, services, pricing)   | `Vete/web/.content_data/fun4me/*.json`            |
| Brand (colors, fonts, logo)         | `Vete/web/.content_data/fun4me/theme.json`        |
| Domain routing                      | `Vete/web/.content_data/domains.json`              |
| Custom code / components            | `Vete/web/app/[clinic]/*` (shared across tenants)  |

## What this repo is for now

This repo contains a standalone Next.js e-commerce prototype with admin panel, product catalog (Supabase), and cart. The **content** (brand, contact, config) has been consolidated into the `fun4me` tenant in Ai-Whisperers/Vete. The **code-level features** (admin panel, catalog, cart) remain here pending a separate refactor PR to port them into Vete as reusable platform modules.

## Do not

- Do not deploy this repo standalone to production
- Do not treat this as the source of truth for website content
- Do not make content changes here expecting them to go live

---

_This repo is kept for history and non-website assets. Website-layer consolidation tracked in Ai-Whisperers/Vete PR #65 (merged)._
