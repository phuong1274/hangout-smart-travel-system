# Seed pipeline

This folder provides a safe re-runnable seed process for the discovery/dashboard scope.

## 1) Set connection string

```bash
export MYSQL_URL="mysql://user:pass@host:3306/dbname"
```

## 2) Run seed

```bash
bash HSTS.BE/scripts/seed/run-seed.sh
```

## Notes

- `00_reset_scope.sql` clears only the scope tables in dependency-safe order.
- `10_destinations.sql`, `20_locations.sql`, `30_reviews.sql` should be filled with validated INSERT statements from `Master Data.xlsx`.
- `40_dashboard_support.sql` is optional support data for dashboard scenarios.
