const express = require("express");

const router = express.Router();

router.post("/", (req, res) => {
    const { message } = req.body;

    if (!message || typeof message !== "string") {
        return res.status(400).json({
            error: "message is required"
        });
    }

    res.json({
        message: "AI service received your request",
        userMessage: message
    });
});

module.exports = router;
