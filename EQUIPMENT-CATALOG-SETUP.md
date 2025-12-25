# Equipment Catalog Setup Guide

## Overview
The equipment catalog system allows you to maintain a master list of equipment items with daily rates in Supabase. When creating T&M estimates, you can quickly select equipment from this catalog instead of manually entering each item.

## Setup Steps

### 1. Run SQL Schema in Supabase

1. Open your Supabase project
2. Go to the SQL Editor
3. Copy and paste the contents of `create-equipment-catalog.sql`
4. Click "Run" to execute

This will create:
- `equipment_catalog` table with sample equipment items
- Indexes for performance
- Auto-update timestamp trigger
- Row Level Security policies

### 2. Managing Your Equipment Catalog

#### Via Supabase Table Editor:
1. Go to Table Editor in Supabase
2. Select `equipment_catalog` table
3. Add/edit equipment items with these fields:
   - `equipment_name`: Name of the equipment (e.g., "Air Mover - Large")
   - `category`: Optional grouping (e.g., "Drying Equipment", "Air Quality")
   - `daily_rate`: Cost per day as a decimal (e.g., 75.00)
   - `description`: Optional details
   - `is_active`: Set to `true` to show in picker, `false` to hide

#### Importing from Excel:
If you have an Excel file with equipment data:

1. Convert your Excel tab to CSV format
2. Use Supabase's CSV import feature or
3. Format your data as INSERT statements like:

```sql
INSERT INTO equipment_catalog (equipment_name, category, daily_rate, description) VALUES
  ('Equipment Name', 'Category', 100.00, 'Description'),
  ('Another Item', 'Category', 50.00, 'Description');
```

### 3. Using the Equipment Picker

In the T&M Estimate section:

1. Navigate to Schedule C (Equipment)
2. Click "+ Add Line Item"
3. Click the 📋 button next to the Description field
4. Select an equipment item from the catalog
5. The equipment name and daily rate will auto-populate
6. Enter the number of days needed
7. The total will calculate automatically

## Features

- **Quick Selection**: Click 📋 button to browse equipment catalog
- **Auto-Fill**: Equipment name and daily rate populate automatically
- **Category Organization**: Equipment items grouped by category in the picker
- **Manual Override**: Can still type equipment manually if not in catalog
- **Live Calculations**: Totals update in real-time based on days × daily rate

## Sample Equipment Categories

The default setup includes these categories:
- Drying Equipment (air movers, dehumidifiers)
- Air Quality (air scrubbers, hydroxyl generators)
- Testing Equipment (moisture meters, thermal cameras)
- Containment (barriers, negative air machines)

## Maintenance

- **Add Items**: Add new equipment to the catalog via Supabase Table Editor
- **Update Rates**: Edit daily_rate field to update pricing
- **Deactivate**: Set is_active = false to hide equipment without deleting
- **Categories**: Use consistent category names for better organization

## Technical Details

- **Service File**: `src/services/equipmentCatalogService.js`
- **Database Table**: `equipment_catalog` in Supabase
- **Component**: Equipment picker integrated into `TMEstimate.jsx`
- **Auto-load**: Equipment catalog loads automatically when page opens
