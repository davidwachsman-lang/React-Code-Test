# Starting the Servers

Starting both frontend and backend servers is now seamless with automatic Node.js detection.

## Quick Start

Simply run:

```bash
npm start
```

or

```bash
npm run dev
```

Both commands do the same thing - they automatically:
- Detect Node.js on your system (works regardless of PATH configuration)
- Start the backend server (port 3001)
- Start the frontend server (port 5173)
- Display organized, colored output from both servers

## Available Commands

- `npm start` or `npm run dev` - Start both servers (recommended)
- `npm run start:all` - Alternative command to start both servers
- `npm run start:backend` - Start only the backend server
- `npm run start:frontend` - Start only the frontend server

## Using Cursor Tasks

You can also use Cursor's task runner:

1. Open the Command Palette (Cmd+Shift+P / Ctrl+Shift+P)
2. Type "Tasks: Run Task"
3. Select "Start All Servers"

This will start both servers in a dedicated terminal panel.

## Access Your App

Once servers are running:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## How It Works

The startup script (`scripts/start.js`) automatically:
- Checks if Node.js is in your PATH
- Searches common installation locations (Homebrew, nvm, system installs)
- Uses `concurrently` to run both servers with organized output
- Handles cleanup when you stop the servers (Ctrl+C)

## Troubleshooting

### Node.js Not Found

If you see an error that Node.js isn't found:
1. Install Node.js from [nodejs.org](https://nodejs.org/)
2. Or use Homebrew: `brew install node`
3. Or use nvm: `nvm install node`

The script will automatically detect Node.js once it's installed, even if it's not in your PATH.

### Port Already in Use

If you see port conflicts:
- Backend (3001): Stop any other process using port 3001
- Frontend (5173): Stop any other process using port 5173

You can check what's using a port with:
```bash
lsof -ti:3001  # Check backend port
lsof -ti:5173  # Check frontend port
```

### Install Dependencies

If you haven't installed dependencies yet:
```bash
npm install
cd backend && npm install && cd ..
```
