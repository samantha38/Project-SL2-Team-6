/**
 * Integrated Server - Express + Next.js
 * Serves both WebSocket and Next.js dashboard
 * WebSocket Server: port 3000
 * Next.js Dashboard: port 3001
 */

require("dotenv").config();
const WebSocket = require("ws");
const express = require("express");
const http = require("http");
const path = require("path");
const Groq = require("groq-sdk");
const { spawn } = require("child_process");

const app = express();
const port = 3000; // WebSocket server port
const nextPort = 3001; // Next.js dashboard port (to avoid conflict)

// API Key Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

const server = http.createServer(app);
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// WebSocket Server
const wss = new WebSocket.Server({
  server,
  clientTracking: true,
  perMessageDeflate: false,
  maxPayload: 100 * 1024,
});

let aiSedangMikir = false;
let connectionCount = 0;
let latestSensorData = {
  voc: 0,
  pm25: 0,
  pm10: 0,
  temperature: 0,
  humidity: 0,
  pressure: 0,
  timestamp: new Date(),
};

// AI Analysis Configuration
const AI_ANALYSIS_INTERVAL = 5 * 60 * 1000; // 5 minutes
let lastAIAnalysis = 0;
let aiAnalysisCount = 0;

console.log("=====================================");
console.log("🚀 Integrated Server Starting");
console.log("=====================================");
console.log(`AI Analysis Interval: ${AI_ANALYSIS_INTERVAL / 60000} minutes`);
console.log("Context: Industrial Factory Environment");
console.log("=====================================\n");

// Start Next.js in development mode
let nextProcess;
if (process.env.NODE_ENV !== 'production') {
  console.log("Starting Next.js development server...");
  nextProcess = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, 'nextjs-dashboard'),
    stdio: 'inherit',
    shell: true
  });

  nextProcess.on('error', (error) => {
    console.error('Failed to start Next.js:', error);
  });
}

// Broadcast to all clients
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

// Heartbeat
function heartbeat() {
  this.isAlive = true;
}

const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log(`[!] Client #${ws.clientId} timeout - terminating`);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

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
  ws.on("pong", heartbeat);

  console.log(
    `\n[${new Date().toLocaleTimeString()}] ✅ Client #${clientId} connected`
  );
  console.log(`[Client #${clientId}] IP: ${clientIP}`);
  console.log(`[Server] Total clients: ${wss.clients.size}\n`);

  ws.send(
    JSON.stringify({
      type: "welcome",
      message: "Connected to Server",
      clientId: clientId,
      timestamp: new Date().toISOString(),
    })
  );

  // Message Handler
  ws.on("message", async (message) => {
    try {
      const dataStr = message.toString();

      if (dataStr === "ping" || dataStr === "pong") {
        return;
      }

      let data;
      try {
        data = JSON.parse(dataStr);
      } catch (parseError) {
        return;
      }

      console.log(`[Client #${clientId}] Type: ${data.type}`);

      if (data.type === "init") {
        ws.deviceName = data.device; // Store device name for disconnect notification
        console.log(`[Client #${clientId}] Device: ${data.device} initialized`);

        ws.send(
          JSON.stringify({
            type: "init_ack",
            message: "Device registered",
            clientId: clientId,
          })
        );

        broadcast({
          type: "device_status",
          device: data.device,
          status: "online",
          clientId: clientId,
          timestamp: new Date().toISOString(),
        });
      } else if (data.type === "sensor_data") {
        // Debug: Log full data structure
        console.log(`[Client #${clientId}] 📡 Sensor data received`);
        console.log(`[Client #${clientId}] Data keys:`, Object.keys(data));
        console.log(`[Client #${clientId}] PM10 value:`, data.pm10, `(type: ${typeof data.pm10})`);

        // Log PM10 for debugging
        if (data.pm10 !== undefined && data.pm10 !== null) {
          console.log(`[Client #${clientId}] ✅ PM10 found: ${data.pm10}`);
        } else {
          console.log(`[Client #${clientId}] ⚠️ PM10 is ${data.pm10 === undefined ? 'undefined' : 'null'}`);
          // Try to find it with different case
          if (data.PM10 !== undefined) {
            console.log(`[Client #${clientId}] Found PM10 (uppercase): ${data.PM10}`);
            data.pm10 = data.PM10;
          }
        }

        latestSensorData = {
          ...data,
          timestamp: new Date(),
          clientId: clientId,
        };

        if (data.ml_mode) {
          console.log(`[Client #${clientId}] 🤖 ML Mode: PM2.5=${data.pm25 || 0} PM10=${data.pm10 || 0} (Predicted)`);
        }

        const broadcastData = {
          type: "sensor_data",
          ...data,
          pm10: data.pm10 || 0,
          pm25: data.pm25 || 0,
          ml_mode: data.ml_mode || false,
          source: data.source || "Sensor",
          wifi_status: data.wifi_status || "Unknown",
        };

        broadcast(broadcastData);

        // AI Analysis (with time-based rate limiting)
        const now = Date.now();
        const timeSinceLastAI = now - lastAIAnalysis;

        // Only run AI analysis every 5 minutes
        if (!aiSedangMikir && timeSinceLastAI > AI_ANALYSIS_INTERVAL) {
          aiSedangMikir = true;
          lastAIAnalysis = now;
          aiAnalysisCount++;

          console.log(`[AI] Running analysis #${aiAnalysisCount} (${(timeSinceLastAI / 60000).toFixed(1)} min since last)`);

          processAI(data).finally(() => {
            aiSedangMikir = false;
          });
        } else if (timeSinceLastAI < AI_ANALYSIS_INTERVAL) {
          const remainingTime = Math.ceil((AI_ANALYSIS_INTERVAL - timeSinceLastAI) / 60000);
          console.log(`[AI] Next analysis in ${remainingTime} minute(s)`);
        }
      }
    } catch (error) {
      console.error(`[✗ Client #${clientId}] Error:`, error.message);
    }
  });

  ws.on("close", (code, reason) => {
    console.log(
      `\n[${new Date().toLocaleTimeString()}] ⚠️ Client #${clientId} disconnected`
    );
    console.log(`[Server] Remaining clients: ${wss.clients.size}\n`);

    // Broadcast device offline status to dashboards
    broadcast({
      type: "device_status",
      status: "offline",
      device: ws.deviceName || "ESP32",
      clientId: clientId,
      timestamp: new Date().toISOString(),
    });
  });

  ws.on("error", (error) => {
    console.error(`[✗ Client #${clientId}] WebSocket error:`, error.message);
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
          content: `Industrial sensor readings: VOC=${data.voc || 0}ppb, eCO2=${data.eco2 || 0}ppm, PM2.5=${data.pm25 || 0}µg/m³, PM10=${data.pm10 || 0}µg/m³, Temperature=${data.temperature || data.temp_bmp || 0}°C, Humidity=${data.humidity || 0}%, Atmospheric Pressure=${data.pressure || 0}hPa. Provide analysis and recommendations for factory operations.`,
        },
      ],
      model: "llama-3.3-70b-versatile",
      max_tokens: 200,
      temperature: 0.6, // Lower temperature for more consistent, professional output
    });

    const aiResponse =
      chatCompletion.choices[0]?.message?.content || "AI analysis unavailable";
    console.log(`[AI] 🤖 Industrial Analysis: ${aiResponse}`);

    broadcast({
      type: "ai_response",
      text: aiResponse,
      timestamp: new Date().toISOString(),
      analysisCount: aiAnalysisCount,
    });
  } catch (err) {
    console.error("[AI] ❌ Error:", err.message);

    // Send fallback message
    broadcast({
      type: "ai_response",
      text: "AI analysis system temporarily offline. All sensors are actively monitored and data is being recorded. System operations continue normally.",
      timestamp: new Date().toISOString(),
      error: true,
    });
  }
}

// REST API Endpoints
app.get("/", (req, res) => {
  // Redirect to Next.js dashboard
  res.redirect(`http://localhost:${nextPort}`);
});

app.get("/dashboard", (req, res) => {
  // Alternative route to Next.js dashboard
  res.redirect(`http://localhost:${nextPort}`);
});

app.get("/api/status", (req, res) => {
  res.json({
    service: "Integrated Server",
    status: "running",
    stats: {
      activeClients: wss.clients.size,
      totalConnections: connectionCount,
      uptime: Math.floor(process.uptime()),
    },
    latestData: latestSensorData,
    dashboards: {
      nextjs: `http://localhost:${nextPort}`,
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
  console.log("✓ Integrated Server Running");
  console.log("=====================================");
  console.log(`WebSocket Server: ws://localhost:${port} (ESP32 connects here)`);
  console.log(`Next.js Dashboard: http://localhost:${nextPort}/`);
  console.log(`API: http://localhost:${port}/api/status`);
  console.log(`Time: ${new Date().toLocaleString()}`);
  console.log("=====================================\n");
  console.log(`Next.js dashboard starting on port ${nextPort}...`);
  console.log("Waiting for ESP32 connection on port 3000...\n");
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

  if (nextProcess) {
    nextProcess.kill();
  }

  server.close(() => {
    console.log("[✓] Server closed");
    process.exit(0);
  });
}

