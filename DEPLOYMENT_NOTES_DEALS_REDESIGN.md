# Deployment: Deals workspace card + drag redesign

## Scope

Frontend-only. No migrations.

## Deploy

```bash
cd frontend
npm install   # if needed
npm run build
```

Redeploy the Next.js app (Vercel / static export host).

## Verify

1. Open `/deals` (or `/pipeline` if it shares the same board).
2. Confirm deal cards show: client avatar, company name, deal title, value, badges, next step, owner avatar, last activity, days in stage.
3. Drag a card between columns — column should subtly highlight; dragged card lifts with shadow.
4. Click **+ Add deal** at column bottom — modal opens with that stage pre-selected.
5. Top bar shows pipeline total, active count, and status dots (closing / at risk / attention).

## Rollback

Revert the frontend deploy commit; no backend changes required.
