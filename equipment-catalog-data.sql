-- Equipment Catalog Data
-- First, add a unique constraint on equipment_name if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'equipment_catalog_equipment_name_key'
    ) THEN
        ALTER TABLE equipment_catalog ADD CONSTRAINT equipment_catalog_equipment_name_key UNIQUE (equipment_name);
    END IF;
END $$;

-- Clear existing data (optional - uncomment if you want to start fresh)
-- DELETE FROM equipment_catalog WHERE id > 0;

-- Insert all equipment items with daily rates
INSERT INTO equipment_catalog (equipment_name, daily_rate, category) VALUES
-- Air Equipment
('Air Compressor - Portable', 42.00, 'Air Equipment'),
('Air Mover - XL/LJ', 44.00, 'Air Equipment'),
('Air Mover - Carpet', 30.00, 'Air Equipment'),
('Air Scrubber - 2000 cfm', 165.00, 'Air Equipment'),
('Air Scrubber - 1000 cfm', 128.00, 'Air Equipment'),
('Air Scrubber - 900 cfm', 90.00, 'Air Equipment'),
('Electrostatic Sprayer', 125.00, 'Air Equipment'),
('Fogger/Mist/Odor', 60.00, 'Air Equipment'),
('Fogger/Thermal', 140.00, 'Air Equipment'),
('Meltblower/Hotbox Machine', 475.00, 'Air Equipment'),
('Pressure Washer - Hot', 180.00, 'Air Equipment'),
('Exhaust HEPA Vac', 315.00, 'Air Equipment'),
('Insulation Vacuum', 357.50, 'Air Equipment'),
('Orbital Floor Machine', 137.50, 'Floor Equipment'),
('Portable Carpet Machine', 357.50, 'Floor Equipment'),
('Portable Dry Cleaning Machine', 357.50, 'Floor Equipment'),
('Portable Extractor', 225.00, 'Floor Equipment'),
('Portable Fuel Cells', 27.50, 'Equipment'),
('Pump - Sump (Ega)', 175.00, 'Pumps'),
('Pump - Trash (2" to 4")', 150.00, 'Pumps'),
('Truck Mount Carpet/Extraction Machine', 522.50, 'Floor Equipment'),
('Rover Extraction Unit', 220.00, 'Floor Equipment'),
('Ultrasonic Cleaning Machine', 412.50, 'Cleaning Equipment'),
('Vacuum - Upright Vacuum Cleaner', 26.25, 'Cleaning Equipment'),
('Vacuum - Back Pack, HEPA', 110.00, 'Cleaning Equipment'),
('Vacuum - Wet/Dry', 55.00, 'Cleaning Equipment'),
('Vador Shark', 70.00, 'Equipment'),

-- Cameras & Imaging
('Camera - (Infrared/Thermal Imaging', 50.00, 'Cameras & Imaging'),
('Dehumidifier - Large Commercial (76 and over PPD)', 150.00, 'Dehumidifiers'),
('Dehumidifier - Medium Commercial (75 and under PPD)', 125.00, 'Dehumidifiers'),
('Desiccant - 1600 cfm', 475.00, 'Dehumidifiers'),
('Desiccant - 3000 cfm', 1225.00, 'Dehumidifiers'),
('Desiccant - 5000 cfm', 1625.00, 'Dehumidifiers'),
('Desiccant - 7500 cfm', 2150.00, 'Dehumidifiers'),
('Desiccant - 10000 cfm', 2775.00, 'Dehumidifiers'),
('Desiccant - 15000 cfm', 4450.00, 'Dehumidifiers'),
('5000 cfm Desiccant Package Unit (**)', 2860.00, 'Dehumidifiers'),
('Deviccant Doo-Kit - Total/one time charge', 325.00, 'Dehumidifiers'),
('Dry Forced Injectdry (Wall Cavity)', 145.00, 'Drying Equipment'),
('DX Unit - 25 Ton', 302.50, 'HVAC Equipment'),
('DX Unit - 10 Ton', 1100.00, 'HVAC Equipment'),
('DX Unit - 3- Ton', 1450.00, 'HVAC Equipment'),
('Flex Duct', 27.50, 'HVAC Equipment'),
('Temporary Heat: 150k-200k BTU', 425.00, 'Heating Equipment'),
('Temporary Heat: 200k-300k BTU', 1155.00, 'Heating Equipment'),
('Temporary Heat: 300k-450k BTU', 1375.00, 'Heating Equipment'),
('Fire Cleaning Package (**)', 616.00, 'Fire Equipment'),
('Video Inspection', 300.00, 'Inspection Equipment'),
('Wheel Blaster', 125.00, 'Cleaning Equipment'),
('Hydroxyl', 235.00, 'Air Equipment'),
('Ozone Generator - Activated Oxygen', 142.00, 'Air Equipment'),

-- Cables & Electrical
('Cable - 100 ft', 38.50, 'Electrical'),
('Cable - 50 ft', 30.25, 'Electrical'),
('Cable Ramps', 17.55, 'Electrical'),
('Generator Cable - 5 Band', 82.50, 'Electrical'),
('Generator - 20kW', 410.00, 'Generators'),
('Generator - 35kW', 590.50, 'Generators'),
('Generator - 50kW', 797.50, 'Generators'),
('Generator - 100kW', 915.00, 'Generators'),
('Generator - 150kW', 1100.00, 'Generators'),
('Generator - 200kW', 1300.00, 'Generators'),
('Generator - 300kW', 1550.00, 'Generators'),
('Generator - 500kW', 2700.00, 'Generators'),
('Generator - 1000kW', 5670.00, 'Generators'),
('Generator - Portable', 175.00, 'Generators'),
('Power Distribution 100-200 Amp', 148.00, 'Electrical'),
('Spider Box (With Cable)', 80.00, 'Electrical'),
('Mouckateur or Matterport Imaging Cameras', 300.00, 'Cameras & Imaging'),

-- Carts & Lighting
('Demo Carts', 25.00, 'Equipment'),
('Floor Scraper - Electric', 75.00, 'Floor Equipment'),
('Lighting - 100'' String Lights', 25.00, 'Lighting'),
('Lighting - 90'' String Lights', 16.00, 'Lighting'),
('Lighting - Mobile', 25.00, 'Lighting'),
('Lighting - Tower Mobile', 168.00, 'Lighting'),
('Lighting - Wobble', 48.50, 'Lighting'),
('Lock-Out/Tag-Out Kit', 25.00, 'Safety Equipment'),
('Material Fall Protection (With Lanyard)', 27.00, 'Safety Equipment'),
('Scaffolding, Bakers (Per Section)', 42.50, 'Scaffolding'),
('Splif Lift/Castor', 50.00, 'Scaffolding'),

-- Vehicles
('Vehicle - Auto/Pick-up', 100.00, 'Vehicles'),
('Vehicle - Box Truck', 175.00, 'Vehicles'),
('Vehicle - Cargo/Passenger Van', 130.00, 'Vehicles'),
('Vehicle - Flatbed', 550.00, 'Vehicles'),
('Vehicle - Onsite Recovery Trailer (53'')', 300.00, 'Vehicles'),
('Vehicle - Semi-Tractor', 375.00, 'Vehicles'),
('Vehicle - Trailer', 140.00, 'Vehicles')
ON CONFLICT (equipment_name) DO UPDATE SET
  daily_rate = EXCLUDED.daily_rate,
  category = EXCLUDED.category,
  updated_at = NOW();
