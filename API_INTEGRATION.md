# Supabase Integration Guide

This project now uses Supabase as the source of truth for Estimates, Jobs, Customers, and War Room metrics. The React services call Supabase directly—no custom backend or REST endpoints required.

## 1. Environment Setup
```env
# .env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Restart the dev server (`npm run dev`) whenever you change these values.

## 2. Supabase Client
`src/services/supabaseClient.js` exports:
- `supabase`: the initialized client.
- `handleSupabaseResult`: helper to surface errors consistently.

All service files import from here.

## 3. Service APIs

> Each method returns the raw `data` array/object from Supabase. Wrap them in `useApi` / `useApiMutation` for loading/error states.

### Estimates (`src/services/estimateService.js`)
- `getAll()` – `select('*').order('CreatedAt', { ascending: false })`
- `getById(id)` – filter by `EstimateID`
- `create(payload)` – `insert` + `select().single()`
- `update(id, payload)` – `update` + `select().single()`
- `delete(id)` – `delete()`
- `search(query)` – `or` filters on name/description/address
- `getByCustomer(customerId)` – `eq('CustomerID', customerId)`

### Jobs (`src/services/jobService.js`)
- Standard CRUD + `getByDivision` and `getByStatus`
- `updateStatus(id, status)` updates the `Status` column

### Customers (`src/services/customerService.js`)
- CRUD + `search`
- `getWithJobs(id)` fetches the customer and related jobs via two Supabase calls and merges them.

### Metrics (`src/services/metricsService.js`)
- CRUD operations + helpers for `division`, urgent filters, and checkbox state.

## 4. Component Usage
Nothing changes for the components—continue to import the services just like before:

```javascript
import { useApi } from '../hooks/useApi';
import { estimateService } from '../services';

const { data: estimates, loading, error } = useApi(() => estimateService.getAll(), []);
```

For mutations:

```javascript
import { useApiMutation } from '../hooks/useApi';
import { jobService } from '../services';

const { mutate: saveJob } = useApiMutation();

const handleSave = () =>
  saveJob(() => jobService.create(formData));
```

## 5. Schema Reference
The services expect these columns (adjust if your schema differs):

### Estimates
`EstimateID`, `CustomerID`, `JobID`, `EstimateName`, `EstimateDescription`, `PropertyAddress`, `EstimateData`, `TotalAmount`, `Status`, `CreatedAt`, `UpdatedAt`

### Jobs
`JobID`, `CustomerID`, `JobName`, `Division`, `Status`, `CreatedAt`, `UpdatedAt`, plus any additional operational fields (`AssignedTo`, `Budget`, etc.)

### Customers
`CustomerID`, `Name`, `Email`, `Phone`, `Address`, `Notes`, `CreatedAt`, `UpdatedAt`

### Metrics
`id`, `division`, `subdivision`, `description`, `currentValue`, `targetValue`, `priority`, `isChecked`, `createdAt`, `updatedAt`

Update the Supabase queries if you prefer lower_snake_case or different column names.

## 6. Testing & Troubleshooting
1. Run `npm run dev`.
2. In the browser console:
   ```javascript
   import('./services/TEST_CONNECTION').then(m => m.testSupabaseConnection());
   ```
3. If it fails, verify env vars and Row Level Security policies.

Common errors:
- **`Invalid API key`** – wrong anon key or not for this project.
- **`permission denied`** – RLS policy missing or too restrictive.
- **`relation "TableName" does not exist`** – ensure the table name matches exactly (case sensitive).

## 7. Customizing Further
- Need advanced filters, joins, or stored procedures? Supabase RPC calls or PostgREST filters can be added inside the same service files.
- Want to keep a traditional REST API? Replace the Supabase calls inside the service with `fetch`/`axios` calls; the components won’t need changes.

You’re fully migrated to Supabase—happy building!
