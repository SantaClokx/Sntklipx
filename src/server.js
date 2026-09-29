import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createRouter } from "./services/router.js";

const app = express();
const port = Number(process.env.PORT || 8080);

app.disable("x-powered-by");
app.use(helmet());
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map(v => v.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length
    ? (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("Origin not allowed by sntklipx API."));
      }
    : true
}));
app.use(express.json({ limit: "16kb" }));
app.use(morgan("combined"));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "sntklipx-api" });
});

app.use("/api", createRouter());

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    ok: false,
    error: err.publicMessage || "Internal server error."
  });
});

app.listen(port, () => {
  console.log(`sntklipx API listening on port ${port}`);
});
