# Deployment: Customer Relationship Intelligence Layer

## Pre-deploy

1. **Backup** production DB (SQLite or Postgres).
2. Pull latest `main` after this commit.

## Backend

```bash
python manage.py migrate clients 0008_relationship_intelligence_layer
```

Migration `0008` adds:

- `Client.relationship_owner` (nullable FK to user)
- Expanded `relationship_status` choices (9 human states)
- `ClientProductLink.relationship`: `seasonal`, `high_value`

No data backfill required — existing rows keep valid values.

## API (new / extended)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/clients/{id}/profile/` | Now includes `relationship_intelligence` object |
| `GET /api/clients/relationship-workspace/` | Company-wide calm signals (max 24) |

Client write/patch accepts `relationship_owner` (user id).

## Frontend

Rebuild and redeploy Next app:

```bash
cd frontend && npm run build
```

Surfaces:

- Client profile: **Relationship intelligence** card + expanded state picker
- Dashboard: **Relationship workspace** panel (foundation for command center)

## Performance note

`relationship-workspace` evaluates intelligence per client in-process. Fine for small/medium tenant sizes; for large fleets consider caching or background aggregation in a future pass.

## Rollback

Revert deploy + migrate back to `0007` only if no new statuses/owners were written (or accept data loss on new enum values).
