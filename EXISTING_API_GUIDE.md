# Using an Existing Backend Instead of Supabase

By default, the services in `src/services/` talk to Supabase. If you already have a REST/GraphQL backend and want to keep using it, simply replace the Supabase calls with your own network requests. The React components don’t need to change—the service layer is the only touch point.

## 1. Point the Service at Your API

```javascript
// src/services/estimateService.js
import { createApiClient } from './utils/apiClient';

const api = createApiClient(import.meta.env.VITE_API_BASE_URL);

const estimateService = {
  getAll: () => api.get('/v1/estimate/list'),
  getById: (id) => api.get(`/v1/estimate/${id}`),
  create: (payload) => api.post('/v1/estimate', payload),
  update: (id, payload) => api.put(`/v1/estimate/${id}`, payload),
  delete: (id) => api.delete(`/v1/estimate/${id}`)
};
```

`createApiClient` can be a tiny helper that wraps `fetch`/`axios` and automatically injects headers, auth tokens, etc.

## 2. Keep the Method Signatures
As long as `estimateService.getAll()` still returns a promise that resolves to your data, the rest of the app will continue to work. The same applies to `jobService`, `customerService`, and `metricsService`.

## 3. Environment Variables
```env
VITE_API_BASE_URL=https://api.yourcompany.com/v1
```
Use whatever variables your backend needs—tokens, tenants, etc.—and read them inside the service files.

## 4. Example Helper
```javascript
// src/services/utils/apiClient.js
export const createApiClient = (baseUrl) => {
  const request = async (path, options = {}) => {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || response.statusText);
    }

    return response.json();
  };

  return {
    get: (path) => request(path, { method: 'GET' }),
    post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
    put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
    patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (path) => request(path, { method: 'DELETE' }),
  };
};
```

## 5. Authentication?
If your backend requires tokens:
```javascript
const token = localStorage.getItem('authToken');
const request = (path, options = {}) =>
  fetch(`${baseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    ...options,
  });
```

## 6. Summary
- Supabase is the default storage layer.
- To use an existing backend, update the service files to call your API.
- Keep the public service method names the same so the rest of the app is unaffected.

This hybrid approach lets you switch between Supabase and any other backend whenever you need.
