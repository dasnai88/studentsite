  _____ _             _            _      _       _        
 / ____| |           | |          | |    | |     | |       
| (___ | |_ __ _  ___| | _____  __| | ___| | __ _| |_ ___  
 \___ \| __/ _` |/ __| |/ / _ \/ _` |/ _ \ |/ _` | __/ _ \ 
 ____) | || (_| | (__|   <  __/ (_| |  __/ | (_| | ||  __/ 
|_____/ \__\__,_|\___|_|\_\___|\__,_|\___|_|\__,_|\__\___| 

Studentsite - marketplace for student work with escrow payments,
balance wallet, disputes, and buyer/seller chat.

----------------------------------------------------------------
FEATURES
- Escrow flow: payment -> hold on buyer wallet -> release to seller
- Wallet balances (available / held)
- SBP demo payments (manual confirm)
- Disputes + refunds workflow
- Buyer <-> seller chat per order
- Admin moderation and dispute resolution

----------------------------------------------------------------
TECH STACK
- Frontend: React + Vite
- Backend: Node.js + Express
- DB: MySQL

----------------------------------------------------------------
QUICK START (LOCAL)
1) Install deps
   - frontend:
     npm install
   - backend:
     cd server
     npm install

2) Configure env
   - server/.env (example in server/.env.example)
   - For demo mode (no real payments):
     PAYMENT_PROVIDER=mock

3) Run backend
   cd server
   npm run dev

4) Run frontend
   cd ..
   npm run dev

5) Open
   http://localhost:5173

----------------------------------------------------------------
PAYMENTS (DEMO MODE)
This project is configured to work without real money.
Payment confirmation is manual:
- "Pay via SBP" -> "Confirm payment"
Funds are held in buyer wallet and released to seller after confirmation.

----------------------------------------------------------------
PROJECT STRUCTURE
.
|-- src/                # frontend (React)
|-- server/             # backend (Express)
|   |-- src/
|   |-- db/
|   |   |-- migrations/
|-- index.html
|-- vite.config.js

----------------------------------------------------------------
COMMON COMMANDS
Frontend:
  npm run dev
  npm run build

Backend:
  cd server
  npm run dev

----------------------------------------------------------------
NOTES
- Database tables are auto-created on server start.
- For real payments you need a provider and webhook configuration.

