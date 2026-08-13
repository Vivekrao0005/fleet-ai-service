// Phase 1 prototype — not used in production
const express = require("express");
const {
    getVehicle,
    searchVehicles
} = require("../services/fleetClient");

const router = express.Router();

router.get("/vehicles/:vehicleId", async (req, res) => {
    try {
        const vehicle = await getVehicle(req.params.vehicleId);

        res.json({
            source: "fleet-service",
            vehicle
        });
    } catch (error) {
        console.error(error);

        res.status(502).json({
            error: "Unable to reach fleet service",
            message: error.message
        });
    }
});

router.get("/vehicles", async (req, res) => {
    try {
        const vehicles = await searchVehicles(req.query);

        res.json({
            source: "fleet-service",
            count: vehicles.length,
            vehicles
        });
    } catch (error) {
        console.error(error);

        res.status(502).json({
            error: "Unable to reach fleet service",
            message: error.message
        });
    }
});

module.exports = router;
