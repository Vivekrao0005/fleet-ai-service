// Phase 1 prototype — not used in production
const FLEET_SERVICE_URL =
    process.env.FLEET_SERVICE_URL || "http://localhost:8080";

async function getVehicle(vehicleId) {
    const response = await fetch(
        `${FLEET_SERVICE_URL}/api/vehicles/${vehicleId}`
    );

    if (!response.ok) {
        throw new Error(
            `Fleet service returned ${response.status}`
        );
    }

    return response.json();
}

async function searchVehicles(filters = {}) {
    const params = new URLSearchParams();

    if (filters.locationId !== undefined) {
        params.append("locationId", filters.locationId);
    }

    if (filters.status !== undefined) {
        params.append("status", filters.status);
    }

    if (filters.vehicleType !== undefined) {
        params.append("vehicleType", filters.vehicleType);
    }

    if (filters.maxUtilization !== undefined) {
        params.append("maxUtilization", filters.maxUtilization);
    }

    const response = await fetch(
        `${FLEET_SERVICE_URL}/api/vehicles?${params.toString()}`
    );

    if (!response.ok) {
        throw new Error(
            `Fleet service returned ${response.status}`
        );
    }

    return response.json();
}

module.exports = {
    getVehicle,
    searchVehicles
};
