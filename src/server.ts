import express, { Response, Request, Application } from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import stakingRoutes from "./staking/stakingRoutes";
import gamehubRoutes from "./gamehub/gamehubRoutes";
import revenueRoutes from './revenue/revenueRoutes';
import adminDashboardRoutes from "./adminDashboard/adminDashboardRoutes";
import { getUser } from "./utils/firebaseUtils";
import { PublicKey } from "@solana/web3.js";
// import { initializeTransactionMonitoring } from './utils/transactionMonitor'; // 🔹 NEW: Monitor service
import callbackRoutes from './callbacks/callbackRoutes'; // 🔹 NEW: Callback routes



// Load environment variables
dotenv.config();

const app: Application = express();

// Middleware
app.use(cors({
    origin: [process.env.CLIENT_URL, "http://localhost:3000", "*"], // Add allowed origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true
}));


app.use(bodyParser.json());

// Routes
app.use("/api/admin", adminDashboardRoutes);
app.use("/api/staking", stakingRoutes);
app.use("/api/gamehub/", gamehubRoutes);
app.use('/api/revenue/', revenueRoutes);
app.use('/api/callbacks/', callbackRoutes);

// Server Port
const PORT = process.env.PORT || 5000;

app.get('/', (req: Request, res: Response): any => {
    return res.json({ message: "Server Up" });
})

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);

// 🔹 NEW: Initialize transaction monitoring
    // initializeTransactionMonitoring();
});

export default app;
