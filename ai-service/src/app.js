const express = require("express");

const chatRoutes = require("./routes/chatRoutes");

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
    res.json({
        status: "UP",
        service: "fleet-ai-service"
    });
});

app.use("/api/chat", chatRoutes);

module.exports = app;
