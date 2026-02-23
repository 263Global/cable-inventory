-- Seed popular global data centers / PoPs as Handover Locations

INSERT INTO handover_locations (name, country, city, type) VALUES
-- Singapore
('Equinix SG1', 'Singapore', 'Singapore', 'Data Center'),
('Equinix SG2', 'Singapore', 'Singapore', 'Data Center'),
('Equinix SG3', 'Singapore', 'Singapore', 'Data Center'),
('Equinix SG4', 'Singapore', 'Singapore', 'Data Center'),
('Equinix SG5', 'Singapore', 'Singapore', 'Data Center'),
('Digital Realty SIN10', 'Singapore', 'Singapore', 'Data Center'),
('Digital Realty SIN11', 'Singapore', 'Singapore', 'Data Center'),
('NTT Singapore Jurong', 'Singapore', 'Singapore', 'Data Center'),
('STT GDC Defu', 'Singapore', 'Singapore', 'Data Center'),
('Telin Singapore', 'Singapore', 'Singapore', 'Data Center'),
-- Hong Kong
('Equinix HK1', 'Hong Kong', 'Hong Kong', 'Data Center'),
('Equinix HK2', 'Hong Kong', 'Hong Kong', 'Data Center'),
('Equinix HK3', 'Hong Kong', 'Hong Kong', 'Data Center'),
('Equinix HK5', 'Hong Kong', 'Hong Kong', 'Data Center'),
('MEGA-i', 'Hong Kong', 'Hong Kong', 'Data Center'),
('SUNeVision HKIS (iAdvantage)', 'Hong Kong', 'Hong Kong', 'Data Center'),
('NTT Hong Kong FDC', 'Hong Kong', 'Hong Kong', 'Data Center'),
('Digital Realty HKG10', 'Hong Kong', 'Hong Kong', 'Data Center'),
-- Japan
('Equinix TY1', 'Japan', 'Tokyo', 'Data Center'),
('Equinix TY2', 'Japan', 'Tokyo', 'Data Center'),
('Equinix TY4', 'Japan', 'Tokyo', 'Data Center'),
('Equinix OS1', 'Japan', 'Osaka', 'Data Center'),
('NTT Otemachi', 'Japan', 'Tokyo', 'Data Center'),
('AT Tokyo CC1', 'Japan', 'Tokyo', 'Data Center'),
-- United States
('Equinix NY5 (SecaucusNJ)', 'United States', 'New York', 'Data Center'),
('Equinix NY9', 'United States', 'New York', 'Data Center'),
('Equinix LA1', 'United States', 'Los Angeles', 'Data Center'),
('Equinix SV5', 'United States', 'San Jose', 'Data Center'),
('Equinix DC2', 'United States', 'Ashburn', 'Data Center'),
('Equinix CH1', 'United States', 'Chicago', 'Data Center'),
('CoreSite LA1', 'United States', 'Los Angeles', 'Data Center'),
('Digital Realty 111 8th Ave', 'United States', 'New York', 'Data Center'),
('Digital Realty 350 E Cermak', 'United States', 'Chicago', 'Data Center'),
('Cyxtera LAX1', 'United States', 'Los Angeles', 'Data Center'),
-- United Kingdom
('Equinix LD4', 'United Kingdom', 'London', 'Data Center'),
('Equinix LD5', 'United Kingdom', 'London', 'Data Center'),
('Equinix LD8 (Docklands)', 'United Kingdom', 'London', 'Data Center'),
('Telehouse North', 'United Kingdom', 'London', 'Data Center'),
('Telehouse East', 'United Kingdom', 'London', 'Data Center'),
('Digital Realty LON1', 'United Kingdom', 'London', 'Data Center'),
('LINX (London IX)', 'United Kingdom', 'London', 'Exchange'),
-- Germany
('Equinix FR5', 'Germany', 'Frankfurt', 'Data Center'),
('Equinix FR6', 'Germany', 'Frankfurt', 'Data Center'),
('Equinix FR7', 'Germany', 'Frankfurt', 'Data Center'),
('DE-CIX Frankfurt', 'Germany', 'Frankfurt', 'Exchange'),
('Interxion FRA1', 'Germany', 'Frankfurt', 'Data Center'),
('NTT Frankfurt 1', 'Germany', 'Frankfurt', 'Data Center'),
-- France
('Equinix PA2', 'France', 'Paris', 'Data Center'),
('Equinix PA3', 'France', 'Paris', 'Data Center'),
('Equinix MA1', 'France', 'Marseille', 'Data Center'),
('Equinix MA3', 'France', 'Marseille', 'Data Center'),
('Interxion MRS1', 'France', 'Marseille', 'Data Center'),
('Interxion PAR5', 'France', 'Paris', 'Data Center'),
('France-IX', 'France', 'Paris', 'Exchange'),
-- Netherlands
('Equinix AM3', 'Netherlands', 'Amsterdam', 'Data Center'),
('Equinix AM5', 'Netherlands', 'Amsterdam', 'Data Center'),
('Equinix AM7', 'Netherlands', 'Amsterdam', 'Data Center'),
('Interxion AMS1', 'Netherlands', 'Amsterdam', 'Data Center'),
('AMS-IX', 'Netherlands', 'Amsterdam', 'Exchange'),
-- UAE / Middle East
('Equinix DX1', 'United Arab Emirates', 'Dubai', 'Data Center'),
('Khazna Data Centers', 'United Arab Emirates', 'Abu Dhabi', 'Data Center'),
('du Datamena', 'United Arab Emirates', 'Dubai', 'Data Center'),
('Gulf Bridge International (GBI) PoP', 'United Arab Emirates', 'Fujairah', 'PoP'),
-- India
('Equinix MB1', 'India', 'Mumbai', 'Data Center'),
('NTT Mumbai DC', 'India', 'Mumbai', 'Data Center'),
('STT GDC Mumbai', 'India', 'Mumbai', 'Data Center'),
('Netmagic DC Mumbai', 'India', 'Mumbai', 'Data Center'),
('Sify Ambattur', 'India', 'Chennai', 'Data Center'),
-- Australia
('Equinix SY1', 'Australia', 'Sydney', 'Data Center'),
('Equinix SY3', 'Australia', 'Sydney', 'Data Center'),
('Equinix SY4', 'Australia', 'Sydney', 'Data Center'),
('NextDC S1', 'Australia', 'Sydney', 'Data Center'),
('NEXTDC M1', 'Australia', 'Melbourne', 'Data Center'),
-- South Korea
('Equinix SE1', 'South Korea', 'Seoul', 'Data Center'),
('LG U+ Pyeongtaek', 'South Korea', 'Seoul', 'Data Center'),
-- Taiwan
('Chief Telecom Taipei', 'Taiwan', 'Taipei', 'Data Center'),
('Chunghwa Telecom IDC', 'Taiwan', 'Taipei', 'Data Center'),
-- Egypt
('Telecom Egypt Smart Village', 'Egypt', 'Cairo', 'Data Center'),
('Telecom Egypt Zafarana', 'Egypt', 'Zafarana', 'PoP'),
-- Kenya
('EADC Mombasa', 'Kenya', 'Mombasa', 'Data Center'),
('iColo Mombasa', 'Kenya', 'Mombasa', 'Data Center'),
-- South Africa
('Teraco JB1', 'South Africa', 'Johannesburg', 'Data Center'),
('Teraco CT1', 'South Africa', 'Cape Town', 'Data Center'),
-- Brazil
('Equinix SP2', 'Brazil', 'São Paulo', 'Data Center'),
('Equinix RJ1', 'Brazil', 'Rio de Janeiro', 'Data Center'),
('Ascenty SP4', 'Brazil', 'São Paulo', 'Data Center'),
-- Malaysia
('AIMS Cyberjaya', 'Malaysia', 'Kuala Lumpur', 'Data Center'),
('NTT Cyberjaya 5', 'Malaysia', 'Kuala Lumpur', 'Data Center'),
-- Indonesia
('NeutraDC Jakarta', 'Indonesia', 'Jakarta', 'Data Center'),
('DCI Indonesia', 'Indonesia', 'Jakarta', 'Data Center'),
-- Thailand
('TRUE IDC Bangkok', 'Thailand', 'Bangkok', 'Data Center'),
-- Philippines
('PLDT Vitro Makati', 'Philippines', 'Manila', 'Data Center'),
-- Vietnam
('CMC Data Center', 'Vietnam', 'Ho Chi Minh City', 'Data Center'),
-- Pakistan
('Transworld TWTC', 'Pakistan', 'Karachi', 'Data Center'),
-- Saudi Arabia
('STC Data Center', 'Saudi Arabia', 'Jeddah', 'Data Center'),
-- Djibouti
('Djibouti Data Center', 'Djibouti', 'Djibouti', 'Data Center'),
-- Italy
('Equinix ML2', 'Italy', 'Milan', 'Data Center'),
('MIX-IT', 'Italy', 'Milan', 'Exchange'),
-- Spain
('Equinix MD2', 'Spain', 'Madrid', 'Data Center'),
('Interxion MAD1', 'Spain', 'Madrid', 'Data Center'),
-- Sweden
('Equinix SK1', 'Sweden', 'Stockholm', 'Data Center'),
('Interxion STO1', 'Sweden', 'Stockholm', 'Data Center'),
-- Switzerland
('Equinix ZH4', 'Switzerland', 'Zurich', 'Data Center'),
-- Canada
('Equinix TR1', 'Canada', 'Toronto', 'Data Center'),
('Cologix MTL3', 'Canada', 'Montreal', 'Data Center')
ON CONFLICT DO NOTHING;
