# 🗺️ TripLog: Travel Expense & Memory Tracker

TripLog is a comprehensive travel management system that integrates trip planning, real-time expense tracking, and gallery-based memory storage. It provides travelers with a single dashboard to manage their finances and memories seamlessly.

## 🚀 Core Features

- **👤 User Profiles:** Secure username-based authentication to keep your trip logs private and organized.
- **💰 Smart Expense Dashboard:** 
  - **Categorization:** Track spending across Food, Transport, Hotel, Shopping, and more.
  - **Auto-Calculation:** Real-time total cost updates in your local currency (₹).
  - **Visual Analytics:** Breakdown of spending habits to help you stay within budget.
- **📸 Trip Memory Vault:** Integrated photo gallery where your travel memories are mapped specifically to each trip.
- **💾 Hybrid Storage:** Dual-layer data protection using a Cloud Database (PostgreSQL) and LocalStorage for offline resilience.
- **⚡ Optimistic UI:** Experience a lightning-fast interface that updates immediately, ensuring a smooth experience even on slow networks.
- **🛡️ Resiliency Layer:** Custom synchronization that prioritize local data safety if the server is temporarily unreachable.

## 🛠️ Tech Stack

- **Frontend:** React (v19), Vite, Lucide-React, Custom CSS (Glassmorphism)
- **Backend:** Node.js, Express
- **Database:** PostgreSQL (Neon Cloud)
- **File Handling:** Multer for high-resolution photo uploads

## 🏁 Getting Started

1. **Install Dependencies:**
   ```bash
   npm install
   cd backend && npm install
   ```
2. **Setup Environment:**
   Create a `.env` file in the `backend` directory with your database connection strings.
3. **Run the App:**
   ```bash
   # From the root directory
   npm run dev
   ```

---
*Created as a comprehensive travel management solution.*
