import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: process.env.PORT || 8080});

const espClients = new Map();
let backendClient = null;

wss.on("connection", (ws, req) => {
  console.log("New connection");
  console.log(req.headers);
  const headers = req.headers["sec-websocket-protocol"].split(",");
  const clientType = headers[0];


  if (clientType === "esp") {
    const espId = headers[1];
    espClients.set(espId, ws);

    ws.on("message", (message) => {
      const data = JSON.parse(message);

      if (backendClient && backendClient.readyState === WebSocket.OPEN) {
        backendClient.send(JSON.stringify({ espId, ...data }));
      }
    });

    ws.on("close", () => {
      espClients.delete(espId);
    });
  } else if (clientType === "backend") {
    backendClient = ws;

    backendClient.on("message", (message) => {
      const data = JSON.parse(message);
      const esp32Id = data.esp32Id;

      console.log(`Received message from backend: ${JSON.stringify(data)}`);

      if (esp32Id && espClients.has(esp32Id)) {
        const espClient = espClients.get(esp32Id);

        if (espClient && espClient.readyState === WebSocket.OPEN) {
          espClient.send(JSON.stringify(data));
        }
      }
    });

    backendClient.on("close", () => {
      backendClient = null;
    });
  } else {
    ws.close();
  }
});