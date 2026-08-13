package com.fleetai.ops.vehicle;

public class VehicleNotFoundException extends RuntimeException {

    public VehicleNotFoundException(String vehicleId) {
        super("Vehicle not found: " + vehicleId);
    }
}

