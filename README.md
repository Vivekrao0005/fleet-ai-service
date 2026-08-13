# Fleet AI Service

An agentic operations prototype that answers natural-language questions about a rental car fleet. You ask a question in plain English; the service classifies your intent with an LLM, calls the right internal tool to query PostgreSQL, and returns an accurate answer. Numeric queries (count, average utilization, total revenue) bypass the LLM entirely and return deterministic results — no hallucinated numbers. The frontend tracks conversation history so follow-up questions like "what are they?" resolve correctly.

Built with Node.js, Express, PostgreSQL, and Groq (Llama 3.3 70B). Deployed on AWS Elastic Beanstalk.

[LIVE DEMO](http://your-url-here)

> **Note:** This is a portfolio prototype running on synthetic data. It is not affiliated with any commercial fleet operator. All vehicle IDs, VINs, names, and locations are fabricated.

---

## Architecture

```
User question
      |
      v
+-------------+     +--------------------+
|  Groq LLM   |---->| Intent Classifier  |
|  (call 1)   |     | returns JSON:      |
+-------------+     |  action, filters,  |
                     |  vehicleId         |
                     +---------+----------+
                               |
                    +----------v----------+
                    |    Tool Router      |
                    |                     |
                    |  getVehicle()       |
                    |  searchVehicles()   |
                    |  analyzeFleet()     |
                    |  rankRelocation()   |
                    +----------+----------+
                               |
                       SQL query (pg)
                               |
                        +------v------+
                        | PostgreSQL  |
                        +------+------+
                               |
                +--------------v--------------+
                |  Deterministic or LLM?      |
                |                             |
                |  count / avg / revenue      |
                |  --> exact answer, no LLM   |
                |                             |
                |  everything else            |
                |  --> Groq LLM (call 2)     |
                |     with fetched data       |
                +--------------+--------------+
                               |
                               v
                        Answer to user
```

**Two-call pattern.** The first LLM call classifies intent into a structured JSON object (action type, filters, vehicle ID). The second LLM call generates a natural-language answer grounded in the real data. Count, average utilization, and revenue questions skip the second call entirely and return a deterministic answer computed in JavaScript.

**Conversation memory.** The frontend tracks all messages and sends history with each request. The intent classifier uses this history to resolve pronouns and follow-ups ("what are they?", "tell me more about those") into standalone queries before routing.

---

## Schema

Five PostgreSQL tables:

| Table | Rows | Description |
|-------|------|-------------|
| `locations` | 20 | US cities with airport codes and per-type demand scores (sedan, SUV, truck) |
| `vehicles` | 200 | Fleet inventory — vehicle ID, VIN, make/model/year, type (SEDAN/SUV/TRUCK/MINIVAN/LUXURY/EV), location, status (AVAILABLE/RENTED/MAINTENANCE), mileage, utilization %, daily revenue |
| `maintenance_records` | 24 | Repair tickets with severity (LOW–CRITICAL), status, estimated cost, technician notes |
| `utilization_history` | 55 | Monthly snapshots — utilization %, rental days, available days per vehicle |
| `transfer_requests` | 8 | AI-recommended relocations with approval status, reason, and audit trail |

---

## Approval gate

The AI can analyze the fleet and recommend vehicle transfers, but it cannot unilaterally move anything. Every relocation follows this workflow:

```
AI recommends --> PENDING_APPROVAL --> Human approves --> APPROVED --> IN_TRANSIT --> COMPLETED
                                   \-> REJECTED
```

This is enforced at the database level, not the application layer:

- A `CHECK` constraint on `transfer_requests.status` limits values to six valid states
- The `approved_by` column must name a human before status changes to `APPROVED`
- `requested_at`, `approved_at`, and `completed_at` timestamps provide a full audit trail
- `CHECK (from_location_id <> to_location_id)` prevents no-op transfers

Because the constraint lives in PostgreSQL, it holds regardless of which client writes to the table — the API, a migration script, or a direct SQL session. The AI stays advisory; humans stay in control.

---

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- A [Groq API key](https://console.groq.com)

### Database

```bash
createdb fleet_ops

psql -d fleet_ops -f database/01_schema.sql
psql -d fleet_ops -f database/02_seed_data.sql
psql -d fleet_ops -f database/04_expanded_seed_data.sql
```

### Application

```bash
cd Phase2/ai-service

cp .env.example .env
# Fill in your GROQ_API_KEY and PostgreSQL credentials
```

```bash
npm install
npm start
```

The service starts at `http://localhost:3000` with a built-in landing page and chat UI.

### Deploy to AWS Elastic Beanstalk

1. Create a Node.js environment on Elastic Beanstalk.
2. Set environment properties: `GROQ_API_KEY`, `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`.
3. From the `Phase2/ai-service` directory:
   ```bash
   zip -r deploy.zip package.json package-lock.json src/ public/ Procfile
   ```
4. Upload via the EB console → Upload and deploy.

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/ask` | Send `{ question, history }` — returns `{ answer, tool? }` |
| `GET` | `/api/tools/vehicle/:id` | Direct vehicle lookup by ID (bypasses LLM) |
| `GET` | `/health` | Health check — `{ status: "UP" }` |
| `GET` | `/config-check` | Shows whether Groq key and DB are configured (no secrets exposed) |
| `GET` | `/` | Landing page with embedded chat demo |

### Example

```bash
curl -X POST http://localhost:3000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "How many SUVs are available?", "history": []}'
```

```json
{
  "question": "How many SUVs are available?",
  "answer": "There are 28 vehicles available (SUV).",
  "tool": "analyzeFleet"
}
```

---

## Project structure

```
Phase2/ai-service/
├── src/server.js          # Express server, DB queries, Groq integration
├── public/index.html      # Landing page with embedded chat UI
├── _archive/              # Phase 1 prototype files (not used in production)
├── package.json
├── Procfile               # Elastic Beanstalk process definition
└── .env.example           # Required environment variables

Phase2/fleet-service/      # Spring Boot fleet service (reference, not deployed)

database/
├── 01_schema.sql          # Table definitions and indexes
├── 02_seed_data.sql       # Base seed (6 locations, 18 vehicles)
├── 03_practice_queries.sql
└── 04_expanded_seed_data.sql  # Full demo dataset (20 locations, 200 vehicles)
```
