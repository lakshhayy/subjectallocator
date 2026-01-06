import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import rateLimit from "express-rate-limit"; // NEW: Import rate-limit
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import type { User } from "@shared/schema";

const app = express();
const httpServer = createServer(app);
const MemoryStore = createMemoryStore(session);

// NEW: Rate Limiting Implementation
// 100 requests per 15 minutes for most routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for authentication (Login)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Max 10 attempts per 15 mins
  message: { message: "Too many login attempts, please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

declare module "express-session" {
  interface SessionData {
    userId?: string;
    user?: User;
  }
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// NEW: Trust the reverse proxy (Required for secure cookies on Replit/Cloud)
app.set("trust proxy", 1); 

// Apply rate limiting to all API routes
app.use("/api/", generalLimiter);
// Apply stricter rate limiting to auth routes
app.use("/api/auth/login", authLimiter);

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "manit-subject-allotment-secret-key",
    resave: false,
    saveUninitialized: false,
    // NEW: Use MemoryStore to prevent memory leaks in production
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production", // Only send over HTTPS in production
      httpOnly: true, // NEW: Prevents JavaScript (XSS) from reading the cookie
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      sameSite: "strict", // NEW: Prevents CSRF attacks (Strict is best for internal tools)
    },
  })
);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();