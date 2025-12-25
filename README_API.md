# 🚀 Supabase Integration Overview

Your React application now talks directly to Supabase using the official JavaScript client (`@supabase/supabase-js`). The legacy REST/Express layer has been removed, so every service hits your Supabase tables without needing an intermediate backend.

## ✅ What’s Included
- `src/services/supabaseClient.js` – initializes the Supabase client from environment variables.
- `estimateService`, `jobService`, `customerService`, `metricsService` – all CRUD operations now call Supabase.
- `useApi` / `useApiMutation` hooks – continue to work, as the service APIs remain the same.
- Updated documentation & `.env` templates for Supabase-specific configuration.

## ⚙️ Configure Supabase
1. Create (or open) `.env` in the project root.
2. Add your Supabase project credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Restart the dev server: `npm run dev`.

> Keep `.env` out of version control—`.gitignore` already covers it.

## 📦 Available Services
```javascript
import { 
  estimateService,
  jobService,
  customerService,
  metricsService
} from '../services';
```

Each service exposes the same helper methods as before (`getAll`, `getById`, `create`, etc.), but every call now executes a Supabase query.

## 🧪 Test Your Connection
```javascript
import('./services/TEST_CONNECTION').then(m => m.testSupabaseConnection());
```
Run the snippet above from the browser console to perform a quick `select` against the `Estimates` table. Update the table name in `TEST_CONNECTION.js` if you want to validate a different table.

## 🗂 Table Expectations
The services assume the following Supabase tables/columns (adjust queries if your schema differs):

- **Estimates**: `EstimateID`, `CustomerID`, `JobID`, `EstimateName`, `EstimateDescription`, `PropertyAddress`, `EstimateData`, `TotalAmount`, `Status`, `CreatedAt`, `UpdatedAt`
- **Jobs**: `JobID`, `CustomerID`, `JobName`, `Division`, `Status`, `CreatedAt`, `UpdatedAt`, plus any additional WIP fields
- **Customers**: `CustomerID`, `Name`, `Email`, `Phone`, `Address`, `Notes`, timestamps
- **Metrics**: `id`, `division`, `subdivision`, `description`, `currentValue`, `targetValue`, `priority`, `isChecked`, timestamps

> Update the service methods if your column names differ (e.g., snake_case vs. PascalCase). The logic is centralized in `src/services/*.js`.

## 🧩 Need Custom Logic?
If you still need to hit an existing REST API, replace the Supabase calls inside a service with your custom requests or maintain a parallel service. The React components don’t need to change as long as the service method signatures remain consistent.

You’re now ready to manage your Restoration data directly from Supabase—no custom backend code required. 🎉
