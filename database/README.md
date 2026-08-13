# Fleet Operations AI Prototype — Phase 1

Synthetic PostgreSQL database for a fleet-operations agentic AI project.

## Files

- `01_schema.sql` — creates tables, constraints, and indexes.
- `02_seed_data.sql` — inserts synthetic fleet, location, maintenance, and utilization data.
- `03_practice_queries.sql` — useful SQL queries for learning and for the future AI tools.
- `README.md` — setup and project notes.

## Database model

```text
locations
   │
   └────< vehicles
              │
              ├────< maintenance_records
              └────< utilization_history

vehicles
   │
   └────< transfer_requests
```

## PostgreSQL setup

If PostgreSQL is installed locally:

```bash
createdb fleet_ops
psql -d fleet_ops -f 01_schema.sql
psql -d fleet_ops -f 02_seed_data.sql
```

Or from inside `psql`:

```sql
CREATE DATABASE fleet_ops;
\c fleet_ops

\i 01_schema.sql
\i 02_seed_data.sql
```

Then test:

```bash
psql -d fleet_ops -f 03_practice_queries.sql
```

## Important

All data is fictional/synthetic and is only for an educational prototype. It is not real operational data.

## What Phase 1 teaches

- Relational database design
- Primary/foreign keys
- Constraints
- Indexes
- SQL JOINs
- Filtering and sorting
- Aggregation-ready structure
- Fleet utilization modeling
- Maintenance records
- Transfer workflow data

## Next phase

Phase 2 will turn this database into a Java/Spring Boot Fleet Service with REST endpoints such as:

- `GET /api/vehicles`
- `GET /api/vehicles/{id}`
- `GET /api/vehicles?location=Dallas`
- `GET /api/vehicles/underutilized`
- `GET /api/locations/{city}/demand`
- `GET /api/vehicles/{id}/maintenance`

That service will become the controlled tool/API layer that the Node.js AI agent calls later.
