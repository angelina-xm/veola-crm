# Deployment: Deals workspace premium pass (reference-aligned)

## Scope

Frontend-only redesign of `/deals` and `/pipeline` boards.

## Deploy

```bash
cd frontend && npm run build
```

Redeploy Next.js app.

## Verify

1. Open `/deals` — full-bleed dark canvas, command bar with pipeline metrics panel.
2. Sidebar: compact width, purple glow on active Deals link.
3. Cards: company + assignee avatars, value/probability, signal pills, next step, footer metadata.
4. Drag between columns — column highlight, lifted overlay card.
5. Mobile: hamburger in deals command bar opens sidebar.

## Rollback

Revert frontend deploy commit; no API changes.
