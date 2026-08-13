-- Fleet Operations AI Prototype
-- Phase 1: practice queries

-- 1. All Dallas vehicles
SELECT v.vehicle_id, v.make, v.model, v.vehicle_type,
       v.status, v.utilization_percent
FROM vehicles v
JOIN locations l ON v.location_id = l.location_id
WHERE l.city = 'Dallas'
ORDER BY v.utilization_percent;

-- 2. Underutilized Dallas vehicles (< 40%)
SELECT v.vehicle_id, v.make, v.model, v.vehicle_type,
       v.utilization_percent, v.status
FROM vehicles v
JOIN locations l ON v.location_id = l.location_id
WHERE l.city = 'Dallas'
  AND v.utilization_percent < 40
ORDER BY v.utilization_percent ASC;

-- 3. Underutilized vehicles that are available
SELECT v.vehicle_id, v.make, v.model, v.vehicle_type,
       v.utilization_percent
FROM vehicles v
JOIN locations l ON v.location_id = l.location_id
WHERE l.city = 'Dallas'
  AND v.utilization_percent < 40
  AND v.status = 'AVAILABLE'
ORDER BY v.utilization_percent ASC;

-- 4. Maintenance vehicles
SELECT v.vehicle_id, v.make, v.model,
       m.issue, m.severity, m.status, m.estimated_cost
FROM vehicles v
JOIN maintenance_records m ON v.vehicle_id = m.vehicle_id
WHERE m.status IN ('OPEN', 'IN_PROGRESS')
ORDER BY CASE m.severity
           WHEN 'CRITICAL' THEN 1
           WHEN 'HIGH' THEN 2
           WHEN 'MEDIUM' THEN 3
           ELSE 4
         END;

-- 5. Compare Dallas vs Austin demand
SELECT city, state, vehicle_demand_score,
       sedan_demand, suv_demand, truck_demand
FROM locations
WHERE city IN ('Dallas', 'Austin');

-- 6. Candidate vehicles for Dallas -> Austin transfer
-- Basic prototype rule: available + utilization < 40%.
SELECT v.vehicle_id, v.make, v.model, v.vehicle_type,
       v.utilization_percent,
       l.city AS current_location,
       target.city AS target_location,
       CASE v.vehicle_type
           WHEN 'SUV' THEN target.suv_demand
           WHEN 'SEDAN' THEN target.sedan_demand
           WHEN 'TRUCK' THEN target.truck_demand
           ELSE 'MEDIUM'
       END AS target_demand
FROM vehicles v
JOIN locations l ON v.location_id = l.location_id
JOIN locations target ON target.city = 'Austin' AND target.state = 'TX'
WHERE l.city = 'Dallas'
  AND v.status = 'AVAILABLE'
  AND v.utilization_percent < 40
ORDER BY v.utilization_percent ASC;

-- 7. Simple AI-style ranking for Dallas -> Austin.
-- Lower utilization + higher target demand = stronger candidate.
SELECT
    v.vehicle_id,
    v.make,
    v.model,
    v.vehicle_type,
    v.utilization_percent,
    CASE
        WHEN v.vehicle_type = 'SUV' AND target.suv_demand = 'HIGH' THEN 30
        WHEN v.vehicle_type = 'SEDAN' AND target.sedan_demand = 'HIGH' THEN 30
        WHEN v.vehicle_type = 'TRUCK' AND target.truck_demand = 'HIGH' THEN 30
        WHEN v.vehicle_type = 'SUV' AND target.suv_demand = 'MEDIUM' THEN 20
        WHEN v.vehicle_type = 'SEDAN' AND target.sedan_demand = 'MEDIUM' THEN 20
        WHEN v.vehicle_type = 'TRUCK' AND target.truck_demand = 'MEDIUM' THEN 20
        ELSE 10
    END AS demand_score,
    ROUND(
        (100 - v.utilization_percent) * 0.7
        +
        CASE
            WHEN v.vehicle_type = 'SUV' AND target.suv_demand = 'HIGH' THEN 30
            WHEN v.vehicle_type = 'SEDAN' AND target.sedan_demand = 'HIGH' THEN 30
            WHEN v.vehicle_type = 'TRUCK' AND target.truck_demand = 'HIGH' THEN 30
            WHEN v.vehicle_type = 'SUV' AND target.suv_demand = 'MEDIUM' THEN 20
            WHEN v.vehicle_type = 'SEDAN' AND target.sedan_demand = 'MEDIUM' THEN 20
            WHEN v.vehicle_type = 'TRUCK' AND target.truck_demand = 'MEDIUM' THEN 20
            ELSE 10
        END * 0.3
    , 2) AS transfer_score
FROM vehicles v
JOIN locations l ON v.location_id = l.location_id
JOIN locations target ON target.city = 'Austin' AND target.state = 'TX'
WHERE l.city = 'Dallas'
  AND v.status = 'AVAILABLE'
  AND v.utilization_percent < 40
ORDER BY transfer_score DESC;
