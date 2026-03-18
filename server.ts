import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(bodyParser.json());

  // Attendance storage (Simple CSV-like logic in memory for now, persist to file)
  const ATTENDANCE_FILE = path.join(process.cwd(), "attendance.csv");
  if (!fs.existsSync(ATTENDANCE_FILE)) {
    fs.writeFileSync(ATTENDANCE_FILE, "name,date,time,status\n");
  }

  // API Routes
  app.post("/api/attendance", (req, res) => {
    const { name, date, time, status } = req.body;
    const line = `${name},${date},${time},${status}\n`;
    fs.appendFileSync(ATTENDANCE_FILE, line);
    res.json({ success: true, message: "Attendance recorded" });
  });

  app.get("/api/attendance", (req, res) => {
    if (!fs.existsSync(ATTENDANCE_FILE)) return res.json([]);
    const content = fs.readFileSync(ATTENDANCE_FILE, "utf-8");
    const lines = content.trim().split("\n").slice(1);
    const data = lines.map(l => {
      const [name, date, time, status] = l.split(",");
      return { name, date, time, status };
    });
    res.json(data);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Ghost Classroom AI Server running on http://localhost:${PORT}`);
  });
}

startServer();
