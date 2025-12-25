# RestoreLogic.AI Backend

Express.js backend server for RestoreLogic.AI application.

## 🏗️ Architecture

**This application uses Supabase for all database operations.**

The frontend connects directly to Supabase using the Supabase client library. All data operations (CRUD) are handled through Supabase services in the frontend (`src/services/`).

The backend server is minimal and primarily serves as a placeholder for future server-side functionality if needed.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment (Optional)
Edit `.env` file if you need to change the port:
```env
PORT=3001
```

### 3. Start Server
```bash
npm start
# or for development with auto-reload:
npm run dev
```

Server will run on: http://localhost:3001

## 📚 API Endpoints

### Health Check
- `GET /health` - Health check endpoint
- `GET /` - API information

## 💾 Database

**All database operations use Supabase.**

The frontend services (`src/services/`) handle all database interactions:
- `customerService.js` - Customer operations
- `jobService.js` - Job operations
- `estimateService.js` - Estimate operations
- `metricsService.js` - Metrics operations
- `propertyService.js` - Property operations
- `intakeService.js` - Intake form submissions

Supabase configuration is in `src/services/supabaseClient.js`.

## 🔒 CORS Configuration

Currently configured to allow requests from:
- `http://localhost:5173` (React dev server)
- `http://127.0.0.1:5173`

To change, edit `server.js`:
```javascript
app.use(cors({
  origin: 'your-frontend-url',
  credentials: true
}));
```

## 📁 Project Structure

```
backend/
├── server.js           # Main server file (minimal)
├── package.json        # Dependencies
├── .env               # Environment variables (optional)
└── [SQL files]       # Database schema files (reference only)
```

## ✅ Testing

### Test Health Check
```bash
curl http://localhost:3001/health
```

## 🛠️ Development

Install nodemon for auto-reload:
```bash
npm run dev
```

## 📝 Notes

- **Database**: All data operations use Supabase (configured in frontend)
- **Backend**: Currently minimal - serves as placeholder for future server-side features
- **CORS**: Configured for local development
- **SQL Files**: Database schema files are kept for reference but are not used by the application

## 🆘 Troubleshooting

**Port already in use?**
```bash
lsof -ti:3001 | xargs kill
# or change PORT in .env
```

**CORS errors?**
- Update origin in server.js
- Check React app URL matches

**Database issues?**
- Verify Supabase configuration in `src/services/supabaseClient.js`
- Check environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
