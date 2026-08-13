-- Fleet Operations AI Prototype
-- Phase 1: realistic demo data
-- NOTE: This is synthetic data for the prototype, not real operational data.

INSERT INTO locations
    (city, state, airport_code, vehicle_demand_score, sedan_demand, suv_demand, truck_demand)
VALUES
    ('Dallas',  'TX', 'DFW', 68.00, 'MEDIUM', 'HIGH',   'MEDIUM'),
    ('Austin',  'TX', 'AUS', 82.00, 'MEDIUM', 'HIGH',   'HIGH'),
    ('Houston', 'TX', 'IAH', 88.00, 'HIGH',   'HIGH',   'HIGH'),
    ('San Antonio', 'TX', 'SAT', 72.00, 'HIGH', 'MEDIUM', 'HIGH'),
    ('Fort Worth', 'TX', 'FTW', 61.00, 'MEDIUM', 'MEDIUM', 'HIGH'),
    ('Atlanta', 'GA', 'ATL', 79.00, 'HIGH', 'HIGH', 'MEDIUM')
ON CONFLICT (city, state) DO UPDATE SET
    airport_code = EXCLUDED.airport_code,
    vehicle_demand_score = EXCLUDED.vehicle_demand_score,
    sedan_demand = EXCLUDED.sedan_demand,
    suv_demand = EXCLUDED.suv_demand,
    truck_demand = EXCLUDED.truck_demand;

INSERT INTO vehicles
    (vehicle_id, vin, make, model, model_year, vehicle_type, location_id, status,
     mileage, utilization_percent, daily_revenue, last_service_date)
VALUES
    ('H001', '1HGBH41JXMN109186', 'Toyota', 'Camry', 2024, 'SEDAN',
        (SELECT location_id FROM locations WHERE city='Dallas' AND state='TX'),
        'AVAILABLE', 42000, 22.00, 38.50, '2026-06-15'),

    ('H002', '1FMCU9BZ0MUA12345', 'Ford', 'Escape', 2025, 'SUV',
        (SELECT location_id FROM locations WHERE city='Dallas' AND state='TX'),
        'AVAILABLE', 18000, 31.00, 55.25, '2026-07-10'),

    ('H003', '2T3P1RFV5MW123456', 'Toyota', 'RAV4', 2025, 'SUV',
        (SELECT location_id FROM locations WHERE city='Dallas' AND state='TX'),
        'RENTED', 12000, 82.00, 71.00, '2026-07-21'),

    ('H004', '1G1ZB5ST4MF123456', 'Chevrolet', 'Malibu', 2023, 'SEDAN',
        (SELECT location_id FROM locations WHERE city='Dallas' AND state='TX'),
        'AVAILABLE', 56000, 18.00, 31.00, '2026-05-28'),

    ('H005', '1N4BL4BV2MN123456', 'Nissan', 'Altima', 2024, 'SEDAN',
        (SELECT location_id FROM locations WHERE city='Dallas' AND state='TX'),
        'MAINTENANCE', 49000, 12.00, 0.00, '2026-08-01'),

    ('H006', '5NMS3DAJ2NH123456', 'Hyundai', 'Santa Fe', 2025, 'SUV',
        (SELECT location_id FROM locations WHERE city='Dallas' AND state='TX'),
        'AVAILABLE', 21000, 37.00, 58.75, '2026-07-18'),

    ('H007', '1HGCV1F31MA123456', 'Honda', 'Accord', 2024, 'SEDAN',
        (SELECT location_id FROM locations WHERE city='Austin' AND state='TX'),
        'AVAILABLE', 29000, 63.00, 62.00, '2026-07-12'),

    ('H008', '1C4RJFBG5MC123456', 'Jeep', 'Grand Cherokee', 2025, 'SUV',
        (SELECT location_id FROM locations WHERE city='Austin' AND state='TX'),
        'AVAILABLE', 15000, 78.00, 74.50, '2026-07-20'),

    ('H009', '1GC4KZCY1MF123456', 'Chevrolet', 'Silverado', 2024, 'TRUCK',
        (SELECT location_id FROM locations WHERE city='Austin' AND state='TX'),
        'RENTED', 33000, 86.00, 82.00, '2026-06-30'),

    ('H010', '1FMSK8FH7MGA12345', 'Ford', 'Explorer', 2025, 'SUV',
        (SELECT location_id FROM locations WHERE city='Houston' AND state='TX'),
        'AVAILABLE', 17000, 74.00, 69.00, '2026-07-25'),

    ('H011', '1G1ZE5SXXMF123456', 'Chevrolet', 'Malibu', 2024, 'SEDAN',
        (SELECT location_id FROM locations WHERE city='Houston' AND state='TX'),
        'AVAILABLE', 26000, 69.00, 59.50, '2026-07-19'),

    ('H012', '1FTFW1ED5MFA12345', 'Ford', 'F-150', 2025, 'TRUCK',
        (SELECT location_id FROM locations WHERE city='Houston' AND state='TX'),
        'AVAILABLE', 11000, 91.00, 91.00, '2026-07-28'),

    ('H013', '1FM5K8GC4MGA12346', 'Ford', 'Explorer', 2024, 'SUV',
        (SELECT location_id FROM locations WHERE city='San Antonio' AND state='TX'),
        'AVAILABLE', 37000, 44.00, 52.00, '2026-06-20'),

    ('H014', '1HGCM82633A123456', 'Honda', 'Accord', 2023, 'SEDAN',
        (SELECT location_id FROM locations WHERE city='San Antonio' AND state='TX'),
        'AVAILABLE', 61000, 39.00, 45.00, '2026-05-18'),

    ('H015', '1GCUDDED2MF123456', 'Chevrolet', 'Tahoe', 2025, 'SUV',
        (SELECT location_id FROM locations WHERE city='Fort Worth' AND state='TX'),
        'AVAILABLE', 9000, 28.00, 56.00, '2026-07-30'),

    ('H016', '1FMCU0LZ5MUA12346', 'Ford', 'Escape', 2024, 'SUV',
        (SELECT location_id FROM locations WHERE city='Fort Worth' AND state='TX'),
        'AVAILABLE', 45000, 24.00, 48.00, '2026-06-12'),

    ('H017', '1N4BL4BV9MN123457', 'Nissan', 'Altima', 2024, 'SEDAN',
        (SELECT location_id FROM locations WHERE city='Atlanta' AND state='GA'),
        'AVAILABLE', 22000, 76.00, 67.00, '2026-07-22'),

    ('H018', '1C4HJXDG2MW123456', 'Jeep', 'Wrangler', 2025, 'SUV',
        (SELECT location_id FROM locations WHERE city='Atlanta' AND state='GA'),
        'RENTED', 14000, 88.00, 85.00, '2026-07-27')
ON CONFLICT (vehicle_id) DO NOTHING;

INSERT INTO maintenance_records
    (vehicle_id, issue, severity, status, estimated_cost, opened_date, notes)
VALUES
    ('H005', 'Brake pad replacement', 'HIGH', 'IN_PROGRESS', 680.00, '2026-08-01',
        'Front brake pads below service threshold.'),
    ('H003', 'Routine oil service', 'LOW', 'COMPLETED', 95.00, '2026-07-15',
        'Routine scheduled service.'),
    ('H004', 'Tire pressure sensor warning', 'MEDIUM', 'OPEN', 220.00, '2026-08-05',
        'Sensor intermittently reporting low pressure.'),
    ('H012', 'Routine inspection', 'LOW', 'COMPLETED', 140.00, '2026-07-28',
        'Passed inspection.')
ON CONFLICT DO NOTHING;

INSERT INTO utilization_history
    (vehicle_id, recorded_date, utilization_percent, rental_days, available_days)
VALUES
    ('H001', '2026-08-01', 22.00, 7, 24),
    ('H001', '2026-07-01', 25.00, 8, 23),
    ('H002', '2026-08-01', 31.00, 10, 21),
    ('H002', '2026-07-01', 34.00, 11, 20),
    ('H003', '2026-08-01', 82.00, 25, 6),
    ('H004', '2026-08-01', 18.00, 5, 26),
    ('H004', '2026-07-01', 21.00, 6, 25),
    ('H005', '2026-08-01', 12.00, 3, 28),
    ('H006', '2026-08-01', 37.00, 11, 20),
    ('H007', '2026-08-01', 63.00, 19, 12),
    ('H008', '2026-08-01', 78.00, 24, 7),
    ('H010', '2026-08-01', 74.00, 23, 8),
    ('H013', '2026-08-01', 44.00, 14, 17),
    ('H014', '2026-08-01', 39.00, 12, 19),
    ('H015', '2026-08-01', 28.00, 9, 22),
    ('H016', '2026-08-01', 24.00, 7, 24),
    ('H017', '2026-08-01', 76.00, 24, 7),
    ('H018', '2026-08-01', 88.00, 27, 4)
ON CONFLICT (vehicle_id, recorded_date) DO NOTHING;
