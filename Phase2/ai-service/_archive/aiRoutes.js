// Phase 1 prototype — not used in production
const express = require("express");
const { askFleetAI } = require("../services/aiService");

const router = express.Router();

router.post("/ask", async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({
                error: "message is required"
            });
        }

        const answer = await askFleetAI(message);

        res.json({
            message,
            answer
        });

    } catch (error) {
        console.error("AI error:", error);

        res.status(500).json({
            error: "AI request failed",
            message: error.message
        });
    }
});

module.exports = router;
