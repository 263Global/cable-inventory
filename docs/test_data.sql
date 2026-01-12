-- ============================================
-- Test Data Generation for Cable Inventory
-- Run this in Supabase SQL Editor
-- ============================================

-- Insert Test Inventory Data
INSERT INTO inventory (
    resource_id, status, cable_system, segment_type, protection,
    acquisition_type, ownership, supplier, contract_ref,
    capacity_value, capacity_unit,
    a_end_country, a_end_city, a_end_pop,
    z_end_country, z_end_city, z_end_pop,
    mrc, nrc, term_months, start_date, end_date
) VALUES 
-- Inventory 1: AAE-1 Hong Kong to Singapore
('INV-001', 'Active', 'AAE-1', 'Subsea', 'Unprotected',
 'Lease', 'Leased', 'AAE-1 Consortium', 'AAE1-2024-001',
 100, 'Gbps',
 'Hong Kong', 'Hong Kong', 'MEGA-i',
 'Singapore', 'Singapore', 'Equinix SG3',
 8500, 15000, 36, '2024-01-01', '2026-12-31'),

-- Inventory 2: APG Japan to Hong Kong  
('INV-002', 'Active', 'APG', 'Subsea', 'Unprotected',
 'IRU', 'Owned', 'APG Consortium', 'APG-2023-088',
 200, 'Gbps',
 'Japan', 'Tokyo', 'Equinix TY3',
 'Hong Kong', 'Hong Kong', 'MEGA-i',
 12000, 500000, 180, '2023-06-01', '2038-05-31'),

-- Inventory 3: SJC2 US to Japan
('INV-003', 'Active', 'SJC2', 'Subsea', 'Protected',
 'Lease', 'Leased', 'SJC2 Cable System', 'SJC2-2024-015',
 100, 'Gbps',
 'United States', 'Los Angeles', 'CoreSite LA1',
 'Japan', 'Tokyo', 'Equinix TY1',
 15000, 25000, 24, '2024-03-01', '2026-02-28'),

-- Inventory 4: PEACE Cable Europe to Asia
('INV-004', 'Pending', 'PEACE Cable', 'Subsea', 'Unprotected',
 'Lease', 'Leased', 'PEACE Cable', 'PEACE-2024-022',
 100, 'Gbps',
 'France', 'Marseille', 'Interxion MRS',
 'Singapore', 'Singapore', 'Telin-3',
 9500, 18000, 36, '2024-06-01', '2027-05-31'),

-- Inventory 5: Domestic China Link
('INV-005', 'Active', 'China Telecom CN2', 'Terrestrial', 'Protected',
 'Lease', 'Leased', 'China Telecom', 'CT-2024-005',
 400, 'Gbps',
 'China', 'Shanghai', 'GDS Shanghai',
 'China', 'Beijing', 'GDS Beijing',
 5000, 8000, 12, '2024-01-15', '2025-01-14'),

-- Inventory 6: SEA-ME-WE 5 
('INV-006', 'Active', 'SEA-ME-WE 5', 'Subsea', 'Unprotected',
 'Lease', 'Leased', 'SMW5 Consortium', 'SMW5-2023-100',
 100, 'Gbps',
 'Singapore', 'Singapore', 'Equinix SG1',
 'United Arab Emirates', 'Dubai', 'Khazna DC',
 11000, 20000, 36, '2023-09-01', '2026-08-31'),

-- Inventory 7: TGN-Pacific
('INV-007', 'Active', 'TGN-Pacific', 'Subsea', 'Protected',
 'IRU', 'Owned', 'Telia', 'TGN-2022-050',
 100, 'Gbps',
 'United States', 'San Jose', 'Equinix SV5',
 'Japan', 'Tokyo', 'Equinix TY2',
 0, 450000, 180, '2022-01-01', '2037-12-31'),

-- Inventory 8: AAG Cable
('INV-008', 'Active', 'AAG', 'Subsea', 'Unprotected',
 'Lease', 'Leased', 'AAG Consortium', 'AAG-2024-033',
 100, 'Gbps',
 'Hong Kong', 'Hong Kong', 'HKIX',
 'Malaysia', 'Kuala Lumpur', 'AIMS DC',
 6500, 12000, 24, '2024-02-01', '2026-01-31'),

-- Inventory 9: INDIGO West
('INV-009', 'Pending', 'INDIGO', 'Subsea', 'Unprotected',
 'Lease', 'Leased', 'Indigo Consortium', 'IND-2024-008',
 100, 'Gbps',
 'Singapore', 'Singapore', 'Global Switch SG',
 'Australia', 'Perth', 'NextDC P1',
 7500, 14000, 36, '2024-08-01', '2027-07-31'),

-- Inventory 10: EAC-C2C
('INV-010', 'Active', 'EAC-C2C', 'Subsea', 'Unprotected',
 'Lease', 'Leased', 'EAC Consortium', 'EAC-2023-077',
 200, 'Gbps',
 'Hong Kong', 'Hong Kong', 'Equinix HK1',
 'Taiwan', 'Taipei', 'Chief Telecom',
 4500, 8000, 24, '2023-11-01', '2025-10-31');


-- Insert Test Sales Orders
INSERT INTO sales_orders (
    sales_order_id, inventory_link, status, customer_name, salesperson,
    sales_model, sales_type, capacity_value, capacity_unit,
    start_date, end_date, term_months,
    mrc_sales, nrc_sales, costs
) VALUES
-- Order 1: Large enterprise deal on AAE-1
('SO-001', 'INV-001', 'Active', 'Alibaba Cloud', 'Janna Dai',
 'Lease', 'Resale', 20, 'Gbps',
 '2024-03-01', '2026-02-28', 24,
 12000, 5000, 
 '{"cable": {"mrc": 4250, "nrc": 3000}, "backhaulA": {"mrc": 800}, "backhaulZ": {"mrc": 600}}'),

-- Order 2: Content provider on APG (IRU)
('SO-002', 'INV-002', 'Active', 'Netflix Asia', 'Miki Chen',
 'IRU', 'Resale', 50, 'Gbps',
 '2024-01-15', '2034-01-14', 120,
 0, 280000,
 '{"cable": {"nrc": 150000}, "backhaulA": {"nrc": 8000}}'),

-- Order 3: Telecom carrier
('SO-003', 'INV-001', 'Active', 'Singtel', 'Wayne Jiang',
 'Lease', 'Resale', 10, 'Gbps',
 '2024-02-01', '2027-01-31', 36,
 6500, 3000,
 '{"cable": {"mrc": 2125, "nrc": 1500}, "xcA": {"mrc": 150}, "xcZ": {"mrc": 150}}'),

-- Order 4: Cloud provider on SJC2
('SO-004', 'INV-003', 'Active', 'Google Cloud', 'Kristen Gan',
 'Lease', 'Resale', 30, 'Gbps',
 '2024-04-01', '2026-03-31', 24,
 22000, 8000,
 '{"cable": {"mrc": 9000, "nrc": 4500}, "backhaulA": {"mrc": 1200}, "backhaulZ": {"mrc": 1500}}'),

-- Order 5: Gaming company
('SO-005', 'INV-005', 'Pending', 'Tencent Games', 'Becky Hai',
 'Lease', 'Resale', 100, 'Gbps',
 '2024-06-01', '2025-05-31', 12,
 8000, 2000,
 '{"cable": {"mrc": 2500}, "backhaulA": {"mrc": 400}, "backhaulZ": {"mrc": 400}}'),

-- Order 6: Financial services
('SO-006', 'INV-006', 'Active', 'JP Morgan', 'Wolf Yuan',
 'Lease', 'Resale', 10, 'Gbps',
 '2024-01-01', '2026-12-31', 36,
 15000, 10000,
 '{"cable": {"mrc": 2750, "nrc": 3000}, "backhaulA": {"mrc": 1000}, "xcA": {"mrc": 200}}'),

-- Order 7: CDN Provider
('SO-007', 'INV-002', 'Active', 'Akamai', 'Yifeng Jiang',
 'Lease', 'Resale', 40, 'Gbps',
 '2024-03-15', '2026-03-14', 24,
 18000, 5000,
 '{"cable": {"mrc": 4800}, "backhaulA": {"mrc": 800}, "backhaulZ": {"mrc": 600}}'),

-- Order 8: E-commerce
('SO-008', 'INV-003', 'Active', 'Amazon AWS', 'Janna Dai',
 'Lease', 'Resale', 20, 'Gbps',
 '2024-05-01', '2026-04-30', 24,
 16000, 6000,
 '{"cable": {"mrc": 6000, "nrc": 3000}, "backhaulA": {"mrc": 1000}}'),

-- Order 9: Social Media
('SO-009', 'INV-008', 'Active', 'ByteDance', 'Miki Chen',
 'Lease', 'Resale', 25, 'Gbps',
 '2024-02-15', '2026-02-14', 24,
 9500, 3500,
 '{"cable": {"mrc": 3625, "nrc": 1500}, "backhaulA": {"mrc": 500}, "backhaulZ": {"mrc": 400}}'),

-- Order 10: Telecom IRU
('SO-010', 'INV-007', 'Active', 'NTT Communications', 'Wayne Jiang',
 'IRU', 'Resale', 30, 'Gbps',
 '2024-01-01', '2033-12-31', 120,
 0, 180000,
 '{"cable": {"nrc": 135000}}'),

-- Order 11: Enterprise
('SO-011', 'INV-002', 'Active', 'Microsoft Azure', 'Kristen Gan',
 'Lease', 'Resale', 30, 'Gbps',
 '2024-04-01', '2027-03-31', 36,
 14000, 4500,
 '{"cable": {"mrc": 3600}, "backhaulA": {"mrc": 600}, "backhaulZ": {"mrc": 500}}'),

-- Order 12: Gaming
('SO-012', 'INV-010', 'Pending', 'Sony PlayStation', 'Becky Hai',
 'Lease', 'Resale', 20, 'Gbps',
 '2024-07-01', '2026-06-30', 24,
 5500, 2000,
 '{"cable": {"mrc": 2250}, "xcA": {"mrc": 100}}'),

-- Order 13: Carrier
('SO-013', 'INV-001', 'Active', 'PCCW Global', 'Wolf Yuan',
 'Lease', 'Resale', 10, 'Gbps',
 '2024-03-01', '2025-02-28', 12,
 5800, 2500,
 '{"cable": {"mrc": 2125}, "backhaulA": {"mrc": 300}}'),

-- Order 14: OTT
('SO-014', 'INV-006', 'Active', 'Disney+', 'Yifeng Jiang',
 'Lease', 'Resale', 15, 'Gbps',
 '2024-02-01', '2027-01-31', 36,
 10500, 4000,
 '{"cable": {"mrc": 4125, "nrc": 2000}, "backhaulA": {"mrc": 600}}'),

-- Order 15: Fintech
('SO-015', 'INV-005', 'Active', 'Ant Financial', 'Janna Dai',
 'Lease', 'Resale', 50, 'Gbps',
 '2024-04-15', '2026-04-14', 24,
 6500, 2500,
 '{"cable": {"mrc": 1250}, "backhaulA": {"mrc": 300}, "backhaulZ": {"mrc": 300}}'),

-- Order 16: Cloud
('SO-016', 'INV-008', 'Active', 'Huawei Cloud', 'Miki Chen',
 'Lease', 'Resale', 20, 'Gbps',
 '2024-05-01', '2026-04-30', 24,
 7800, 3000,
 '{"cable": {"mrc": 2900, "nrc": 1200}, "backhaulA": {"mrc": 400}}'),

-- Order 17: Carrier
('SO-017', 'INV-009', 'Pending', 'Telstra', 'Wayne Jiang',
 'Lease', 'Resale', 30, 'Gbps',
 '2024-08-01', '2027-07-31', 36,
 9000, 4000,
 '{"cable": {"mrc": 2250, "nrc": 1400}}'),

-- Order 18: Enterprise
('SO-018', 'INV-010', 'Active', 'HSBC', 'Wolf Yuan',
 'Lease', 'Resale', 10, 'Gbps',
 '2024-01-15', '2026-01-14', 24,
 4200, 1500,
 '{"cable": {"mrc": 1125}, "xcA": {"mrc": 100}, "xcZ": {"mrc": 100}}'),

-- Order 19: Media
('SO-019', 'INV-002', 'Active', 'Apple TV+', 'Kristen Gan',
 'Lease', 'Resale', 25, 'Gbps',
 '2024-06-01', '2026-05-31', 24,
 12000, 4000,
 '{"cable": {"mrc": 3000}, "backhaulA": {"mrc": 500}}'),

-- Order 20: Carrier
('SO-020', 'INV-001', 'Active', 'China Mobile Intl', 'Yifeng Jiang',
 'Lease', 'Resale', 15, 'Gbps',
 '2024-04-01', '2026-03-31', 24,
 8200, 3500,
 '{"cable": {"mrc": 3188, "nrc": 1500}}');

-- Verify data
SELECT 'Inventory Count: ' || COUNT(*) as result FROM inventory
UNION ALL
SELECT 'Sales Orders Count: ' || COUNT(*) FROM sales_orders;
