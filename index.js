#!/usr/bin/env node
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";
import TailFile from "@logdna/tail-file";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QUIET_STRING = ["functions:", " hosting:", "storage:", "pubsub:"];

const quiet = process.argv.indexOf("--quiet");
const fileIndex = process.argv.indexOf("--file");
const portIndex = process.argv.indexOf("--port");

const PORT = portIndex > -1 && process.argv[portIndex + 1] ? parseInt(process.argv[portIndex + 1]) : 4500;

// Determine if data is being piped in via Linux CLI (e.g., command | node index.js)
const isPiped = !process.stdin.isTTY;
const hasFile = fileIndex > -1 && process.argv[fileIndex + 1];

if (!hasFile && !isPiped) {
  console.error("❌ Missing input: Please provide a --file argument or pipe logs via stdin.");
  process.exit(1);
}

const clients = [];

// Native static asset and endpoint router
const server = http.createServer((req, res) => {
  if (req.url === "/") {
    const filePath = path.join(__dirname, "public", "index.html");
    fs.readFile(filePath, (err, data) => {
      if (err) { console.error(`❌ File read failed at: ${filePath}`, err.message); res.writeHead(500); res.end("Error loading index.html"); }
      else { res.writeHead(200, { "Content-Type": "text/html" }); res.end(data); }
    });
    return;
  }

  if (req.url === "/style.css") {
    const filePath = path.join(__dirname, "public", "style.css");
    fs.readFile(filePath, (err, data) => {
      if (err) { console.error(`❌ File read failed at: ${filePath}`, err.message); res.writeHead(500); res.end("Error loading style.css"); }
      else { res.writeHead(200, { "Content-Type": "text/css" }); res.end(data); }
    });
    return;
  }

  if (req.url === "/client.js") {
    const filePath = path.join(__dirname, "public", "client.js");
    fs.readFile(filePath, (err, data) => {
      if (err) { console.error(`❌ File read failed at: ${filePath}`, err.message); res.writeHead(500); res.end("Error loading client.js"); }
      else { res.writeHead(200, { "Content-Type": "application/javascript" }); res.end(data); }
    });
    return;
  }

  if (req.url === "/stream") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    });

    clients.push(res);
    req.on("close", () => {
      const idx = clients.indexOf(res);
      if (idx > -1) clients.splice(idx, 1);
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`\n🚀 UI Console: http://localhost:${PORT}`);
});

function emitToBrowser(logPayload) {
  const data = JSON.stringify(logPayload);
  clients.forEach(client => client.write(`data: ${data}\n\n`));
}

// Extracted line processing logic so it can be used by both TailFile and Stdin
function processLine(line) {
  if (
      quiet >= 0 &&
      QUIET_STRING.some((str) =>
          new RegExp(`(?<=^...)(.*)${str}`, "gm").test(line)
      )
  )
    return;

  const timeStamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  let outputData = {
    type: "text",
    time: timeStamp,
    severity: "DEFAULT",
    message: line,
    payload: null
  };

  if (line.trim().startsWith(">") && line.includes("{") && line.endsWith("}")) {
    try {
      const jsonStart = line.indexOf("{");
      const json = JSON.parse(line.substring(jsonStart));
      outputData.type = "json";
      outputData.severity = json?.severity || "INFO";
      outputData.message = json?.message || line.substring(jsonStart);
      outputData.payload = json;
    } catch (err) {
      // Fall back gracefully to plaintext format
    }
  }

  emitToBrowser(outputData);
}

async function startStream() {
  if (isPiped) {
    console.log(`📦 Tailing Target: Standard Input (stdin)\n`);

    // Read directly from the terminal pipe
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    rl.on("line", processLine);

  } else if (hasFile) {
    const targetFile = process.argv[fileIndex + 1];
    console.log(`📦 Tailing Target: File (${targetFile})\n`);

    // Read from the targeted file using TailFile
    const tail = new TailFile(targetFile).on("tail_error", (err) => {
      console.error("TailFile had an error!", err);
    });

    try {
      await tail.start();
      const rl = readline.createInterface({
        input: tail,
      });

      rl.on("line", processLine);
    } catch (err) {
      console.error("Cannot start. Does the file exist?", err);
    }
  }
}

startStream().catch((err) => {
  process.nextTick(() => {
    throw err;
  });
});