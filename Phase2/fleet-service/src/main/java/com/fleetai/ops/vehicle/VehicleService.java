package com.fleetai.ops.vehicle;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
public class VehicleService {

    private final VehicleRepository vehicleRepository;

    public VehicleService(VehicleRepository vehicleRepository) {
        this.vehicleRepository = vehicleRepository;
    }
    
    public List<Vehicle> getUnderutilizedVehicles(BigDecimal threshold) {
    return vehicleRepository.findByUtilizationPercentLessThan(threshold);
}
    
    public List<Vehicle> searchVehicles(
            Integer locationId,
            String status,
            String vehicleType,
            BigDecimal maxUtilization) {

        List<Vehicle> vehicles = vehicleRepository.findAll();

        return vehicles.stream()
                .filter(vehicle ->
                        locationId == null ||
                        vehicle.getLocationId().equals(locationId))
                .filter(vehicle ->
                        status == null ||
                        vehicle.getStatus().equalsIgnoreCase(status))
                .filter(vehicle ->
                        vehicleType == null ||
                        vehicle.getVehicleType().equalsIgnoreCase(vehicleType))
                .filter(vehicle ->
                        maxUtilization == null ||
                        vehicle.getUtilizationPercent()
                                .compareTo(maxUtilization) < 0)
                .toList();
    }

    public Vehicle getVehicleById(String vehicleId) {
        return vehicleRepository.findById(vehicleId)
                .orElseThrow(() ->
                        new VehicleNotFoundException(vehicleId));
    }
}
