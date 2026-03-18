import express from "express";
import path from "path";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();

app.use(cors());
app.use(bodyParser.json());

// API Routes (if any are still needed)
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Ghost Classroom AI API is active" });
});

// For Vercel, we don't need to serve static files here if we use vercel.json rewrites
// But we can keep it for local testing or as a fallback
const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));

// Export the app for Vercel
export default app;
