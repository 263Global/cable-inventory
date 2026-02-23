  -- ==============================================
  -- CableTrack Seed Data — Test Scenarios
  -- Run in Supabase SQL Editor
  -- ==============================================

  -- 1. Customers (3)
  INSERT INTO customers (id, short_name, name, full_name, contact_email, notes) VALUES
    (gen_random_uuid(), 'Telstra', 'Telstra', 'Telstra International', 'john@telstra.com', 'Tier 1 carrier'),
    (gen_random_uuid(), 'NTT', 'NTT', 'NTT Communications', 'tanaka@ntt.com', 'Japan partner'),
    (gen_random_uuid(), 'PCCW', 'PCCW', 'PCCW Global', 'wong@pccw.com', 'HK local carrier');

  -- 2. Inventory Resources (6 covering all types/statuses)

  -- RES-10001: Capacity / APCN-2 / 1.6T / Available (全新未使用)
  INSERT INTO inventory_resources (
    id, resource_id, type, cable_system_id, spec, capacity_value,
    total_capacity, used_capacity, status, acquisition_type, protection,
    start_date, term_months, end_date, route_description
  ) VALUES (
    gen_random_uuid(), 'RES-10001', 'Capacity',
    (SELECT id FROM cable_systems WHERE name ILIKE '%APCN-2%' LIMIT 1),
    '100G', 1600, 1600, 0, 'Available', 'IRU', 'Unprotected',
    '2025-01-01', 240, '2044-12-31', 'China → Japan'
  );

  -- RES-10002: Capacity / UNITY / 400G / Partial (有sales关联)
  INSERT INTO inventory_resources (
    id, resource_id, type, cable_system_id, spec, capacity_value,
    total_capacity, used_capacity, status, acquisition_type, protection,
    start_date, term_months, end_date, route_description
  ) VALUES (
    gen_random_uuid(), 'RES-10002', 'Capacity',
    (SELECT id FROM cable_systems WHERE name ILIKE '%UNITY%' LIMIT 1),
    '100G', 400, 400, 0, 'Available', 'IRU', 'Unprotected',
    '2025-01-01', 240, '2044-12-31', 'Japan → United States'
  );

  -- RES-10003: Capacity / AAE-1 / 100G / will be Full
  INSERT INTO inventory_resources (
    id, resource_id, type, cable_system_id, spec, capacity_value,
    total_capacity, used_capacity, status, acquisition_type, protection,
    start_date, term_months, end_date, route_description
  ) VALUES (
    gen_random_uuid(), 'RES-10003', 'Capacity',
    (SELECT id FROM cable_systems WHERE name ILIKE '%AAE-1%' LIMIT 1),
    '100G', 100, 100, 0, 'Available', 'Lease', 'Protected',
    '2025-06-01', 60, '2030-05-31', 'Hong Kong → Singapore'
  );

  -- RES-10004: Fiber / 2Africa / Available
  INSERT INTO inventory_resources (
    id, resource_id, type, cable_system_id,
    total_capacity, used_capacity, status, acquisition_type, protection,
    start_date, term_months, end_date, route_description
  ) VALUES (
    gen_random_uuid(), 'RES-10004', 'Fiber',
    (SELECT id FROM cable_systems WHERE name ILIKE '%2Africa%' LIMIT 1),
    0, 0, 'Available', 'IRU', 'Unprotected',
    '2025-01-01', 300, '2049-12-31', 'Angola → Angola'
  );

  -- RES-10005: Spectrum / APG / Available
  INSERT INTO inventory_resources (
    id, resource_id, type, cable_system_id,
    total_capacity, used_capacity, status, acquisition_type, protection,
    start_date, term_months, end_date, route_description
  ) VALUES (
    gen_random_uuid(), 'RES-10005', 'Spectrum',
    (SELECT id FROM cable_systems WHERE name ILIKE '%Asia Pacific Gateway%' LIMIT 1),
    0, 0, 'Available', 'Owned', 'Protected',
    '2024-01-01', 300, '2048-12-31', 'Japan → Malaysia'
  );

  -- RES-10006: Terrestrial / 10G / Available (for Backhaul)
  INSERT INTO inventory_resources (
    id, resource_id, type,
    spec, capacity_value, total_capacity, used_capacity,
    status, acquisition_type, protection,
    start_date, term_months, end_date, route_description
  ) VALUES (
    gen_random_uuid(), 'RES-10006', 'Terrestrial',
    '10G', 10, 10, 0, 'Available', 'Lease', 'Unprotected',
    '2025-01-01', 60, '2029-12-31', 'HKIX → Equinix HK1'
  );

  -- 3. Circuits for RES-10002 (2 circuits: 200G each)
  INSERT INTO inventory_circuits (id, inventory_resource_id, circuit_number, capacity, current_interface_type_id, status)
  SELECT gen_random_uuid(), ir.id, 1, 200, it.id, 'Available'
  FROM inventory_resources ir, interface_types it
  WHERE ir.resource_id = 'RES-10002' AND it.name = '200GE';

  INSERT INTO inventory_circuits (id, inventory_resource_id, circuit_number, capacity, current_interface_type_id, status)
  SELECT gen_random_uuid(), ir.id, 2, 200, it.id, 'Available'
  FROM inventory_resources ir, interface_types it
  WHERE ir.resource_id = 'RES-10002' AND it.name = '200GE';

  -- 4. Circuit for RES-10003 (1 circuit: 100G)
  INSERT INTO inventory_circuits (id, inventory_resource_id, circuit_number, capacity, current_interface_type_id, status)
  SELECT gen_random_uuid(), ir.id, 1, 100, it.id, 'Available'
  FROM inventory_resources ir, interface_types it
  WHERE ir.resource_id = 'RES-10003' AND it.name = '100GE';
