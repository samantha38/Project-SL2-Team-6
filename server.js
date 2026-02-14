require("dotenv").config();
const WebSocket = require("ws");
const express = require("express");
const http = require("http");
const path = require("path");
const Groq = require("groq-sdk");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const port = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "cleankiln-dt-secret-key-2026";

// API Key Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

const server = http.createServer(app);
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// CORS — allow Next.js frontend on port 3001
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:3001");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ─── SQLite Auth Database ───
const db = new Database(path.join(__dirname, "auth.db"));
db.pragma("journal_mode = WAL");

// Create users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Seed default admin account
const existingAdmin = db.prepare("SELECT id FROM users WHERE username = ?").get("admin");
if (!existingAdmin) {
  const hashedPassword = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", hashedPassword, "admin");
  console.log("🔑 Default admin account created (admin / admin123)");
}

// ─── Auth API ───
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Username and password required" });
  }

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  const validPassword = bcrypt.compareSync(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  console.log(`[Auth] ✅ Login: ${user.username} (${user.role})`);
  res.json({
    success: true,
    token,
    user: { id: user.id, username: user.username, role: user.role },
  });
});

app.get("/api/auth/me", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({
      success: true,
      user: { id: decoded.id, username: decoded.username, role: decoded.role },
    });
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
});

// WebSocket Server dengan konfigurasi yang lebih stabil
const wss = new WebSocket.Server({
  server,
  clientTracking: true,
  perMessageDeflate: false, // Disable compression untuk stabilitas
  maxPayload: 100 * 1024, // 100KB max
  handshakeTimeout: 10000, // 10 seconds timeout
  keepaliveInterval: 30000, // 30 seconds
  keepaliveGracePeriod: 10000, // 10 seconds grace period
});

let aiSedangMikir = false;
let connectionCount = 0;
let latestSensorData = {
  moisture: 0,
  timestamp: new Date(),
};

// AI Analysis Configuration
const AI_ANALYSIS_INTERVAL = 5 * 60 * 1000; // 5 minutes
let lastAIAnalysis = 0;
let aiAnalysisCount = 0;

console.log("=====================================");
console.log("🏭 Industrial Sensor Server Starting");
console.log("=====================================");
console.log(`AI Analysis Interval: ${AI_ANALYSIS_INTERVAL / 60000} minutes`);
console.log("Context: Industrial Factory Environment");
console.log("=====================================\n");

// Broadcast ke semua client
function broadcast(data) {
  const message = JSON.stringify(data);
  let sentCount = 0;

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
        sentCount++;
      } catch (error) {
        console.error("[Broadcast Error]:", error.message);
      }
    }
  });

  if (sentCount > 0) {
    console.log(`[Broadcast] Sent to ${sentCount} client(s)`);
  }
}

// Heartbeat untuk menjaga koneksi
function heartbeat() {
  this.isAlive = true;
  this.lastPong = Date.now();
}

const heartbeatInterval = setInterval(() => {
  const now = Date.now();
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      console.log(`[!] Client #${ws.clientId || 'unknown'} timeout - terminating`);
      return ws.terminate();
    }

    // Check if last pong was too long ago
    if (ws.lastPong && (now - ws.lastPong) > 60000) {
      console.log(`[!] Client #${ws.clientId || 'unknown'} no pong response - terminating`);
      ws.isAlive = false;
      return ws.terminate();
    }

    ws.isAlive = false;
    try {
      ws.ping(() => {
        // Ping sent successfully
      });
    } catch (error) {
      console.error(`[!] Failed to ping client #${ws.clientId || 'unknown'}:`, error.message);
      ws.isAlive = false;
      ws.terminate();
    }
  });
}, 30000); // Check every 30 seconds

wss.on("close", () => {
  clearInterval(heartbeatInterval);
});

// WebSocket Connection Handler
wss.on("connection", (ws, req) => {
  connectionCount++;
  const clientId = connectionCount;
  const clientIP = req.socket.remoteAddress;

  ws.clientId = clientId;
  ws.isAlive = true;
  ws.deviceName = null; // Will be set when device sends init message
  ws.lastPong = Date.now();
  ws.connectedAt = Date.now();
  ws.on("pong", heartbeat);

  console.log(
    `\n[${new Date().toLocaleTimeString()}] ✅ Client #${clientId} connected`
  );
  console.log(`[Client #${clientId}] IP: ${clientIP}`);
  console.log(`[Server] Total clients: ${wss.clients.size}\n`);

  // Kirim welcome message
  try {
    ws.send(
      JSON.stringify({
        type: "welcome",
        message: "Connected to Smart Garden Server",
        clientId: clientId,
        timestamp: new Date().toISOString(),
      })
    );
    console.log(`[→ Client #${clientId}] Welcome message sent`);
  } catch (error) {
    console.error(
      `[✗ Client #${clientId}] Failed to send welcome:`,
      error.message
    );
  }

  // Message Handler
  ws.on("message", async (message) => {
    try {
      // Update last activity
      ws.lastActivity = Date.now();

      // Handle binary messages
      if (message instanceof Buffer) {
        const dataStr = message.toString('utf8');
        if (!dataStr || dataStr.trim() === '') {
          console.log(`[Client #${clientId}] Empty message received`);
          return;
        }
        message = dataStr;
      }

      const dataStr = message.toString().trim();

      // Skip empty messages
      if (!dataStr || dataStr === '') {
        return;
      }

      // Skip ping/pong
      if (dataStr === "ping" || dataStr === "pong" || dataStr.toLowerCase() === "ping" || dataStr.toLowerCase() === "pong") {
        ws.isAlive = true;
        ws.lastPong = Date.now();
        return;
      }

      // Log raw message (truncate if too long)
      const logMessage = dataStr.length > 200 ? dataStr.substring(0, 200) + '...' : dataStr;
      console.log(
        `\n[${new Date().toLocaleTimeString()}] [← Client #${clientId}] Raw (${dataStr.length} bytes):`,
        logMessage
      );

      // Parse JSON
      let data;
      try {
        data = JSON.parse(dataStr);
      } catch (parseError) {
        console.log(`[Client #${clientId}] Not JSON, treating as text message`);

        // Balas untuk text message
        ws.send(
          JSON.stringify({
            type: "ack",
            message: "Message received",
            timestamp: new Date().toISOString(),
          })
        );
        return;
      }

      console.log(`[Client #${clientId}] Parsed:`, data);

      // Handle berdasarkan type
      if (data.type === "init") {
        console.log(`[Client #${clientId}] Device: ${data.device} initialized`);

        // Kirim ACK
        ws.send(
          JSON.stringify({
            type: "init_ack",
            message: "Device registered",
            clientId: clientId,
          })
        );

        // Broadcast ke dashboard
        broadcast({
          type: "device_status",
          device: data.device,
          status: "online",
          clientId: clientId,
        });
      } else if (data.type === "sensor_data") {
        // Extract all sensor data
        const kelembapan = data.moisture || 0;
        const rawValue = data.raw || 0;
        const voc = data.voc || 0;
        const pm25 = data.pm25 || 0;
        const pm10 = data.pm10 || 0;
        const temp = data.temperature || data.temp_bmp || 0;
        const humidity = data.humidity || 0;
        const pressure = data.pressure || 0;
        // Calculate altitude from pressure if ESP32 doesn't send it
        const altitude = data.altitude || (pressure > 0 ? 44330 * (1 - Math.pow(pressure / 1013.25, 0.1903)) : 0);

        console.log(
          `[Client #${clientId}] 📊 Sensors: VOC=${voc}ppb PM2.5=${pm25}µg/m³ PM10=${pm10}µg/m³ T=${temp}°C`
        );

        // Simpan data terbaru (comprehensive - include ALL fields from ESP32)
        const eco2 = data.eco2 || data.eCO2 || 0;
        const h2 = data.h2 || 0;
        const ethanol = data.ethanol || 0;
        const relayState = data.relay_state || data.relayState || 'UNKNOWN';
        const rssi = data.rssi || 0;
        const heap = data.heap || 0;
        const wifiStatus = data.wifi_status || data.wifiStatus || 'Connected';
        const mlMode = data.ml_mode || data.mlMode || false;
        const source = data.source || (mlMode ? 'ML_Prediction' : 'Sensor');

        // Determine air quality status
        let status = 'Healthy';
        if (pm25 > 55 || voc > 500) {
          status = 'Unhealthy';
        } else if (pm25 > 35 || voc > 200) {
          status = 'Moderate';
        }

        latestSensorData = {
          moisture: kelembapan,
          raw: rawValue,
          voc: voc,
          pm25: pm25,
          pm10: pm10,
          eco2: eco2,
          h2: h2,
          ethanol: ethanol,
          temp_bmp: temp,
          temperature: temp,
          humidity: humidity,
          pressure: pressure,
          altitude: altitude,
          relay_state: relayState,
          status: status,
          rssi: rssi,
          heap: heap,
          wifi_status: wifiStatus,
          ml_mode: mlMode,
          source: source,
          device: data.device,
          timestamp: new Date(),
          clientId: clientId,
        };

        // 1. Kirim ACK ke ESP32
        const ackResponse = {
          type: "sensor_ack",
          moisture: kelembapan,
          timestamp: new Date().toISOString(),
        };
        ws.send(JSON.stringify(ackResponse));
        console.log(`[→ Client #${clientId}] ACK sent`);

        // 2. Broadcast ke Dashboard (include all sensor data)
        broadcast({
          type: "sensor_data",
          ...latestSensorData,
        });

        // 3. Logika Pompa Otomatis
        let pumpCommand = null;
        let pumpStatus = "";

        if (kelembapan < 30) {
          pumpCommand = "POMPA_ON";
          pumpStatus = "MENYIRAM 🌊";
          console.log(`[Auto] 🚨 Low moisture (${kelembapan}%) - Pump ON`);
        } else if (kelembapan >= 30) {
          pumpCommand = "POMPA_OFF";
          pumpStatus = "STANDBY 🛑";
          console.log(`[Auto] ✓ Moisture OK (${kelembapan}%) - Pump OFF`);
        }

        // Kirim command ke ESP32
        if (pumpCommand) {
          const controlMsg = {
            type: "auto_control",
            action: pumpCommand,
            reason: kelembapan < 30 ? "Low moisture" : "Sufficient moisture",
            moisture: kelembapan,
          };

          ws.send(JSON.stringify(controlMsg));
          console.log(`[→ Client #${clientId}] Control:`, pumpCommand);

          // Broadcast status pompa ke dashboard
          broadcast({
            type: "status_pompa",
            status: pumpStatus,
            moisture: kelembapan,
          });
        }

        // 4. AI Response (with time-based rate limiting - every 5 minutes)
        const now = Date.now();
        const timeSinceLastAI = now - lastAIAnalysis;

        if (!aiSedangMikir && timeSinceLastAI > AI_ANALYSIS_INTERVAL) {
          aiSedangMikir = true;
          lastAIAnalysis = now;
          aiAnalysisCount++;

          console.log(`[AI] ⏳ Running analysis #${aiAnalysisCount} (${(timeSinceLastAI / 60000).toFixed(1)} min since last)`);

          // Jalankan AI di background
          processAI(data).finally(() => {
            aiSedangMikir = false;
          });
        } else if (timeSinceLastAI < AI_ANALYSIS_INTERVAL) {
          const remainingTime = Math.ceil((AI_ANALYSIS_INTERVAL - timeSinceLastAI) / 60000);
          if (Math.random() < 0.1) { // Log only 10% of the time to avoid spam
            console.log(`[AI] Next analysis in ${remainingTime} minute(s)`);
          }
        }
      } else if (data.type === "relay_status") {
        console.log(`[Client #${clientId}] 🔌 Relay: ${data.state}`);

        // Broadcast ke dashboard
        broadcast({
          type: "relay_update",
          state: data.state,
          timestamp: data.timestamp,
          clientId: clientId,
        });
      } else {
        console.log(`[Client #${clientId}] [?] Unknown type: ${data.type}`);
      }
    } catch (error) {
      console.error(`[✗ Client #${clientId}] Error:`, error.message);
    }
  });

  // Disconnect Handler
  ws.on("close", (code, reason) => {
    const connectionDuration = ws.connectedAt ? ((Date.now() - ws.connectedAt) / 1000).toFixed(1) : 'unknown';
    const reasonStr = reason ? reason.toString() : "No reason";

    console.log(
      `\n[${new Date().toLocaleTimeString()}] ⚠️ Client #${clientId} disconnected`
    );
    console.log(
      `[Client #${clientId}] Code: ${code}, Reason: ${reasonStr}`
    );
    console.log(
      `[Client #${clientId}] Connection duration: ${connectionDuration}s`
    );

    // Log common error codes
    if (code === 1006) {
      console.log(`[Client #${clientId}] ⚠️ Code 1006 = Abnormal closure (connection lost without close frame)`);
      console.log(`[Client #${clientId}] Possible causes: Network issue, timeout, or client crash`);
    } else if (code === 1001) {
      console.log(`[Client #${clientId}] Code 1001 = Going away (server/client shutting down)`);
    } else if (code === 1000) {
      console.log(`[Client #${clientId}] Code 1000 = Normal closure`);
    }

    console.log(`[Server] Remaining clients: ${wss.clients.size}\n`);

    // Broadcast ke dashboard
    broadcast({
      type: "device_status",
      status: "offline",
      device: ws.deviceName || "ESP32-S3",
      clientId: clientId,
      timestamp: new Date().toISOString(),
    });
  });

  // Error Handler
  ws.on("error", (error) => {
    console.error(`[✗ Client #${clientId}] WebSocket error:`, error.message);
    console.error(`[✗ Client #${clientId}] Error stack:`, error.stack);

    // Try to send error info to client if possible
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({
          type: "error",
          message: "Server error occurred",
          error: error.message
        }));
      } catch (sendError) {
        console.error(`[✗ Client #${clientId}] Failed to send error message:`, sendError.message);
      }
    }
  });

  // Handle uncaught exceptions in message processing
  ws.on("uncaughtException", (error) => {
    console.error(`[✗ Client #${clientId}] Uncaught exception:`, error.message);
  });
});

// AI Processing Function for Industrial Environment
async function processAI(data) {
  try {
    console.log(`[AI] ⏳ Analyzing industrial sensor data...`);

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are an industrial environmental monitoring expert. Analyze sensor data from a factory/plant environment. Provide professional, technical insights in 2-3 sentences. Focus on: air quality status, potential health/safety concerns, compliance with industrial standards, and actionable recommendations. Be formal and precise.",
        },
        {
          role: "user",
          content: `Industrial sensor readings: VOC=${data.voc || 0}ppb, PM2.5=${data.pm25 || 0}µg/m³, PM10=${data.pm10 || 0}µg/m³, Temperature=${data.temperature || data.temp_bmp || 0}°C, Humidity=${data.humidity || 0}%, Atmospheric Pressure=${data.pressure || 0}hPa, Altitude=${data.altitude || 0}m. Provide analysis and recommendations for factory operations.`,
        },
      ],
      model: "llama-3.3-70b-versatile",
      max_tokens: 200,
      temperature: 0.6, // Lower temperature for more consistent, professional output
    });

    const aiResponse =
      chatCompletion.choices[0]?.message?.content || "AI analysis unavailable";
    console.log(`[AI] 🤖 Industrial Analysis: ${aiResponse}`);

    // Broadcast AI response
    broadcast({
      type: "ai_response",
      text: aiResponse,
      timestamp: new Date().toISOString(),
      analysisCount: aiAnalysisCount,
    });
  } catch (err) {
    console.error("[AI] ❌ Error:", err.message);
    broadcast({
      type: "ai_response",
      text: "AI analysis system temporarily offline. All sensors are actively monitored and data is being recorded. System operations continue normally.",
      error: true,
    });
  }
}

// REST API Endpoints
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "sensor_dashboard.html"));
});

app.get("/industrial", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "industrial_dashboard.html"));
});

app.get("/api/status", (req, res) => {
  res.json({
    service: "Smart Garden WebSocket Server",
    status: "running",
    stats: {
      activeClients: wss.clients.size,
      totalConnections: connectionCount,
      uptime: Math.floor(process.uptime()),
    },
    latestData: latestSensorData,
    endpoints: {
      "GET /": "Dashboard",
      "GET /api/status": "Server info",
      "GET /api/sensor": "Get latest sensor data",
      "POST /api/control": "Send pump control",
      "GET /health": "Health check",
    },
    websocket: {
      url: `wss://${req.get("host") || "localhost:3000"}/`,
      clients: wss.clients.size,
    },
  });
});

app.get("/api/sensor", (req, res) => {
  res.json({
    success: true,
    data: latestSensorData,
    timestamp: new Date(),
  });
});

app.post("/api/control", (req, res) => {
  const { action, command } = req.body;
  const cmd = action || command;

  console.log(`\n[API] Control request: ${cmd}`);

  broadcast({
    type: "control",
    action: cmd,
    source: "api",
    timestamp: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: "Command sent",
    action: cmd,
    sentTo: wss.clients.size,
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
    clients: wss.clients.size,
    memory: process.memoryUsage(),
    timestamp: new Date(),
  });
});

// Start Server
server.listen(port, "0.0.0.0", () => {
  console.log("\n=====================================");
  console.log("✓ Server Running");
  console.log("=====================================");
  console.log(`HTTP: http://localhost:${port}`);
  console.log(`Sensor Dashboard: http://localhost:${port}/`);
  console.log(`Industrial ML: http://localhost:${port}/industrial`);
  console.log(`WebSocket: ws://localhost:${port}`);
  console.log(`\n⚠️  NOTE: Next.js dashboard should run on port 3001 to avoid conflict`);
  console.log(`Time: ${new Date().toLocaleString()}`);
  console.log("=====================================\n");
  console.log("Waiting for ESP32 connection...");
  console.log("ESP32 should connect to: ws://YOUR_PC_IP:3000\n");
});

// Graceful Shutdown
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

function shutdown() {
  console.log("\n[!] Shutting down gracefully...");
  clearInterval(heartbeatInterval);

  wss.clients.forEach((client) => {
    client.close(1000, "Server shutting down");
  });

  server.close(() => {
    console.log("[✓] Server closed");
    process.exit(0);
  });
}
