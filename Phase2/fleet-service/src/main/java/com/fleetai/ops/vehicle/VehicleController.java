package com.fleetai.ops.vehicle;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/vehicles")
public class VehicleController {

    private final VehicleService vehicleService;

    public VehicleController(VehicleService vehicleService) {
        this.vehicleService = vehicleService;
    }

    @GetMapping
    public List<Vehicle> searchVehicles(
            @RequestParam(required = false) Integer locationId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String vehicleType,
            @RequestParam(required = false) BigDecimal maxUtilization) {

        return vehicleService.searchVehicles(
                locationId,
                status,
                vehicleType,
                maxUtilization
        );
    }

    @GetMapping("/underutilized")
    public List<Vehicle> getUnderutilizedVehicles(
            @RequestParam(defaultValue = "50") BigDecimal threshold) {

        return vehicleService.getUnderutilizedVehicles(threshold);
    }

    @GetMapping("/{vehicleId}")
    public ResponseEntity<Vehicle> getVehicle(
            @PathVariable String vehicleId) {

        return ResponseEntity.ok(
                vehicleService.getVehicleById(vehicleId)
        );
    }
}
