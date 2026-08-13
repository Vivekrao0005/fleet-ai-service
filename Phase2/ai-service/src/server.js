const express = require("express");
const path = require("path");
require("dotenv").config();
const { Pool } = require("pg");

const app = express();

const PORT = process.env.PORT || 3000;

const DEFAULT_UNDERUTILIZED_THRESHOLD = 30;

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// -------------------------
// PostgreSQL connection
// -------------------------

function buildPgConfig() {
    const jdbcUrl = process.env.SPRING_DATASOURCE_URL;

    if (jdbcUrl) {
        const match = jdbcUrl.match(
            /jdbc:postgresql:\/\/([^:]+):(\d+)\/(.+)/
        );

        if (match) {
            return {
                host: match[1],
                port: Number(match[2]),
                database: match[3],
                user: process.env.SPRING_DATASOURCE_USERNAME,
                password: process.env.SPRING_DATASOURCE_PASSWORD,
                ssl: { rejectUnauthorized: false }
            };
        }
    }

    return {
        host: process.env.PGHOST || "localhost",
        port: Number(process.env.PGPORT || 5432),
        database: process.env.PGDATABASE || "fleet_ops",
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD
    };
}

const pool = new Pool(buildPgConfig());

// -------------------------
// Health check
// -------------------------

app.get("/health", (req, res) => {
    res.json({
        status: "UP",
        service: "fleet-ai-service"
    });
});

// -------------------------
// Configuration check
// -------------------------

app.get("/config-check", (req, res) => {
    const pgConfig = buildPgConfig();

    res.json({
        groqConfigured: !!process.env.GROQ_API_KEY,
        databaseHost: pgConfig.host,
        databaseName: pgConfig.database
    });
});

// -------------------------
// Database: Get Vehicle
// -------------------------

async function getVehicle(vehicleId) {
    const result = await pool.query(
        `SELECT vehicle_id AS "vehicleId",
                vin,
                make,
                model,
                model_year AS "modelYear",
                vehicle_type AS "vehicleType",
                location_id AS "locationId",
                status,
                mileage,
                utilization_percent AS "utilizationPercent",
                daily_revenue AS "dailyRevenue",
                last_service_date AS "lastServiceDate",
                created_at AS "createdAt",
                updated_at AS "updatedAt"
         FROM vehicles
         WHERE vehicle_id = $1`,
        [vehicleId]
    );

    if (result.rows.length === 0) {
        throw new Error(`Vehicle not found: ${vehicleId}`);
    }

    return result.rows[0];
}

// -------------------------
// Database: Search Vehicles
// -------------------------

async function searchVehicles({
    locationId = null,
    status = null,
    vehicleType = null,
    maxUtilization = null
}) {
    let query = `
        SELECT vehicle_id AS "vehicleId",
               vin,
               make,
               model,
               model_year AS "modelYear",
               vehicle_type AS "vehicleType",
               location_id AS "locationId",
               status,
               mileage,
               utilization_percent AS "utilizationPercent",
               daily_revenue AS "dailyRevenue",
               last_service_date AS "lastServiceDate"
        FROM vehicles
        WHERE 1=1`;

    const params = [];
    let paramIndex = 1;

    if (locationId !== null) {
        query += ` AND location_id = $${paramIndex++}`;
        params.push(locationId);
    }

    if (status !== null) {
        query += ` AND UPPER(status) = UPPER($${paramIndex++})`;
        params.push(status);
    }

    if (vehicleType !== null) {
        query += ` AND UPPER(vehicle_type) = UPPER($${paramIndex++})`;
        params.push(vehicleType);
    }

    if (maxUtilization !== null) {
        query += ` AND utilization_percent < $${paramIndex++}`;
        params.push(maxUtilization);
    }

    query += " ORDER BY vehicle_id";

    const result = await pool.query(query, params);

    return result.rows;
}

// -------------------------
// Fleet Analytics
// -------------------------

function analyzeFleet(vehicles) {
    if (!vehicles || vehicles.length === 0) {
        return {
            vehicleCount: 0,
            averageUtilization: 0,
            totalDailyRevenue: 0
        };
    }

    const vehicleCount = vehicles.length;

    const totalUtilization = vehicles.reduce(
        (sum, vehicle) =>
            sum + Number(vehicle.utilizationPercent || 0),
        0
    );

    const totalDailyRevenue = vehicles.reduce(
        (sum, vehicle) =>
            sum + Number(vehicle.dailyRevenue || 0),
        0
    );

    const averageUtilization =
        totalUtilization / vehicleCount;

    return {
        vehicleCount,
        averageUtilization:
            Number(averageUtilization.toFixed(2)),
        totalDailyRevenue:
            Number(totalDailyRevenue.toFixed(2))
    };
}

// -------------------------
// Relocation Ranking
// -------------------------

function rankRelocationCandidates(vehicles) {
    if (!Array.isArray(vehicles)) {
        return [];
    }

    return [...vehicles]
        .filter((vehicle) => {
            const utilization =
                Number(vehicle.utilizationPercent || 0);

            const vehicleStatus =
                String(vehicle.status || "").toUpperCase();

            return (
                vehicleStatus === "AVAILABLE" &&
                utilization < DEFAULT_UNDERUTILIZED_THRESHOLD
            );
        })
        .sort((a, b) => {
            const utilizationA =
                Number(a.utilizationPercent || 0);

            const utilizationB =
                Number(b.utilizationPercent || 0);

            if (utilizationA !== utilizationB) {
                return utilizationA - utilizationB;
            }

            return Number(a.dailyRevenue || 0) -
                   Number(b.dailyRevenue || 0);
        });
}

// -------------------------
// Format Helpers
// -------------------------

function formatPercent(value) {
    return `${Number(value)
        .toFixed(2)
        .replace(/\.00$/, "")}%`;
}

function formatCurrency(value) {
    return `$${Number(value).toFixed(2)}`;
}

// -------------------------
// Groq: Intent Classifier
// -------------------------

async function classifyIntent(question, history) {
    const historyBlock = history.length > 0
        ? history
            .slice(-10)
            .map((m) => `${m.role}: ${m.content}`)
            .join("\n")
        : "No previous messages.";

    const prompt = `You are a query classifier for a fleet management system.

Given the conversation history and the user's current message, determine what fleet data is needed.

Conversation history:
${historyBlock}

Current message: ${question}

Respond with ONLY valid JSON — no markdown fences, no explanation.

{
  "action": one of "getVehicle", "search", "count", "averageUtilization", "totalRevenue", "relocate", "general",
  "vehicleId": string like "H004" or null,
  "filters": {
    "locationId": number or null,
    "status": "AVAILABLE" or "RENTED" or "MAINTENANCE" or null,
    "vehicleType": "SUV" or "SEDAN" or "TRUCK" or null,
    "maxUtilization": number or null
  },
  "resolvedQuestion": "the user's full intent restated as an explicit standalone question with no pronouns"
}

Classification rules:
- Resolve pronouns ("they", "them", "those", "it", "which ones") using conversation history.
- "cars", "rides", "autos", "fleet" = vehicles.
- "underutilized", "idle", "barely used", "not used much", "sitting around" = maxUtilization: 30.
- "available", "ready", "free", "on the lot" = status: AVAILABLE.
- "rented", "out", "in use", "checked out", "on the road" = status: RENTED.
- "maintenance", "being fixed", "in the shop", "being serviced" = status: MAINTENANCE.
- Vehicle IDs: H followed by 3 digits (e.g., H004, H012). Case-insensitive.
- "how many", "count", "number of" = action: count.
- "average utilization", "avg utilization", "mean utilization" = action: averageUtilization.
- "revenue", "daily revenue", "earning", "making" (about money) = action: totalRevenue.
- "relocate", "move", "transfer", "rebalance", "should we move" = action: relocate.
- If the user asks about a specific vehicle by ID = action: getVehicle.
- If the user wants a list of vehicles matching some criteria = action: search.
- If the question is general conversation, greetings, or not about fleet data = action: general.
- resolvedQuestion must be fully self-contained — never use pronouns that depend on history.
- If the user's message is a follow-up like "what are they?" or "list them" or "tell me more",
  resolve it using the conversation history into a complete explicit question.`;

    try {
        const response = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization:
                        `Bearer ${process.env.GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model:
                        process.env.GROQ_MODEL ||
                        "llama-3.3-70b-versatile",
                    messages: [
                        {
                            role: "system",
                            content:
                                "You are a precise query classifier. Respond with only valid JSON. No markdown."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0,
                    response_format: {
                        type: "json_object"
                    }
                })
            }
        );

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        const text = data.choices[0].message.content;

        return JSON.parse(text);
    } catch {
        return null;
    }
}

// -------------------------
// Groq: Answer Generation
// -------------------------

async function askGroq(
    question,
    fleetData,
    history
) {
    const messages = [
        {
            role: "system",
            content: `You are a Fleet Management AI assistant.

IMPORTANT RULES:
1. Fleet data provided in the user message is the source of truth.
2. Never invent fleet information or vehicles.
3. Never change utilization values.
4. If fleet data is already filtered, only discuss vehicles in that data.
5. For percentages, include the % symbol.
6. For revenue, use dollar formatting.
7. Do not mention assumptions.
8. If the user asks for underutilized / idle / barely used, trust the backend filtering.
9. Do not say "assuming underutilized means..." — the backend already defined it.
10. For relocation recommendations, trust the backend ranking and preserve order.
11. Relocation rule: AVAILABLE status AND utilization below 30%.
12. Keep answers concise and business-focused.
13. When listing vehicles, always include the vehicle ID.`
        }
    ];

    const recentHistory = (history || []).slice(-10);

    for (const msg of recentHistory) {
        messages.push({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content
        });
    }

    const userContent = `User question:
${question}

Fleet data:
${
    fleetData
        ? JSON.stringify(fleetData, null, 2)
        : "No fleet data was requested."
}`;

    messages.push({
        role: "user",
        content: userContent
    });

    const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization:
                    `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model:
                    process.env.GROQ_MODEL ||
                    "llama-3.3-70b-versatile",
                messages,
                temperature: 0.1
            })
        }
    );

    if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
            `Groq API returned ${response.status}: ${errorText}`
        );
    }

    const data = await response.json();

    return data.choices[0].message.content;
}

// -------------------------
// Deterministic Answers
// -------------------------

function buildDeterministicAnswer(
    action,
    analytics,
    filters
) {
    const {
        status,
        vehicleType,
        locationId
    } = filters;

    if (action === "count") {
        let desc =
            `There are ${analytics.vehicleCount} vehicles`;

        if (status === "AVAILABLE") {
            desc += " available";
        } else if (status === "MAINTENANCE") {
            desc += " in maintenance";
        } else if (status === "RENTED") {
            desc += " rented";
        }

        if (vehicleType) {
            desc += ` (${vehicleType})`;
        }

        if (locationId !== null) {
            desc += ` at location ${locationId}`;
        }

        return desc + ".";
    }

    if (action === "averageUtilization") {
        let desc = vehicleType
            ? `The average utilization of ${vehicleType}s is ${formatPercent(analytics.averageUtilization)}`
            : `The average utilization is ${formatPercent(analytics.averageUtilization)}`;

        if (status) {
            desc += ` for ${status.toLowerCase()} vehicles`;
        }

        if (locationId !== null) {
            desc += ` at location ${locationId}`;
        }

        return desc + ".";
    }

    if (action === "totalRevenue") {
        let desc = vehicleType
            ? `The total daily revenue from ${vehicleType}s is ${formatCurrency(analytics.totalDailyRevenue)}`
            : `The total daily revenue is ${formatCurrency(analytics.totalDailyRevenue)}`;

        if (locationId !== null) {
            desc += ` at location ${locationId}`;
        }

        return desc + ".";
    }

    return null;
}

// -------------------------
// Ask AI
// -------------------------

app.post("/api/ask", async (req, res) => {
    try {
        const {
            question,
            history = []
        } = req.body;

        if (
            !question ||
            typeof question !== "string"
        ) {
            return res.status(400).json({
                error: "Question is required"
            });
        }

        // Step 1: Classify intent using Groq
        const intent = await classifyIntent(
            question,
            history
        );

        if (!intent) {
            const answer = await askGroq(
                question,
                null,
                history
            );

            return res.json({
                question,
                answer
            });
        }

        const action = intent.action;
        const resolvedQuestion =
            intent.resolvedQuestion || question;

        const filters = {
            locationId:
                intent.filters?.locationId ?? null,
            status:
                intent.filters?.status ?? null,
            vehicleType:
                intent.filters?.vehicleType ?? null,
            maxUtilization:
                intent.filters?.maxUtilization ?? null
        };

        let fleetData = null;
        let toolUsed = null;

        // Step 2: Fetch data based on classified intent

        if (
            action === "getVehicle" &&
            intent.vehicleId
        ) {
            fleetData = await getVehicle(
                intent.vehicleId.toUpperCase()
            );

            toolUsed = "getVehicle";
        } else if (action === "relocate") {
            fleetData = await searchVehicles({
                locationId: filters.locationId,
                status: "AVAILABLE",
                vehicleType: filters.vehicleType,
                maxUtilization:
                    DEFAULT_UNDERUTILIZED_THRESHOLD
            });

            const candidates =
                rankRelocationCandidates(fleetData);

            fleetData = {
                criteria: {
                    status: "AVAILABLE",
                    maxUtilization:
                        DEFAULT_UNDERUTILIZED_THRESHOLD,
                    locationId: filters.locationId,
                    vehicleType: filters.vehicleType
                },
                candidateCount: candidates.length,
                candidates: candidates.map(
                    (v, i) => ({
                        rank: i + 1,
                        vehicleId: v.vehicleId,
                        make: v.make,
                        model: v.model,
                        vehicleType: v.vehicleType,
                        locationId: v.locationId,
                        status: v.status,
                        utilizationPercent:
                            Number(v.utilizationPercent || 0),
                        dailyRevenue:
                            Number(v.dailyRevenue || 0)
                    })
                )
            };

            toolUsed = "rankRelocationCandidates";
        } else if (
            action === "count" ||
            action === "averageUtilization" ||
            action === "totalRevenue"
        ) {
            fleetData = await searchVehicles(
                filters
            );

            const analytics = analyzeFleet(
                fleetData
            );

            const deterministicAnswer =
                buildDeterministicAnswer(
                    action,
                    analytics,
                    filters
                );

            if (deterministicAnswer) {
                return res.json({
                    question,
                    answer: deterministicAnswer,
                    tool: "analyzeFleet"
                });
            }

            toolUsed = "analyzeFleet";
        } else if (action === "search") {
            fleetData = await searchVehicles(
                filters
            );

            toolUsed = "searchVehicles";
        }

        // Step 3: Generate answer with Groq
        const answer = await askGroq(
            resolvedQuestion,
            fleetData,
            history
        );

        res.json({
            question,
            answer,
            ...(toolUsed && { tool: toolUsed })
        });
    } catch (error) {
        console.error(
            "AI request failed:",
            error
        );

        res.status(500).json({
            error: "AI service failed",
            message: error.message
        });
    }
});

// -------------------------
// Test vehicle tool directly
// -------------------------

app.get(
    "/api/tools/vehicle/:id",
    async (req, res) => {
        try {
            const vehicle = await getVehicle(
                req.params.id
            );

            res.json({
                tool: "getVehicle",
                result: vehicle
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                error: "Tool execution failed",
                message: error.message
            });
        }
    }
);

// -------------------------
// Start server
// -------------------------

app.listen(PORT, () => {
    console.log(
        `AI service running on port ${PORT}`
    );

    console.log(
        `Groq API key configured: ${
            !!process.env.GROQ_API_KEY
        }`
    );

    const pgConfig = buildPgConfig();

    console.log(
        `Database: ${pgConfig.host}/${pgConfig.database}`
    );
});
