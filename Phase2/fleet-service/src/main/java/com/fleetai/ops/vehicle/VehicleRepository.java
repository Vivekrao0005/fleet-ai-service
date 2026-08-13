package com.fleetai.ops.vehicle;

import org.springframework.data.jpa.repository.JpaRepository;

import java.math.BigDecimal;
import java.util.List;

public interface VehicleRepository extends JpaRepository<Vehicle, String> {

    List<Vehicle> findByUtilizationPercentLessThan(BigDecimal threshold);
}
