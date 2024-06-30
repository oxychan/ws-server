import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: process.env.PORT || 8080});

const espClients = new Map();
let backendClient = null;

wss.on("connection", (ws, req) => {
  console.log("New connection");
  console.log(req.headers);
  const clientType = req.headers["sec-websocket-protocol"];

  if (clientType === "arduino") {
    const espId = req.headers["x-esp32-id"];
    console.log(`ESP32 connected with id: ${espId}`);
    espClients.set(espId, ws);

    console.log(`Number of ESP32 clients: ${espClients.size}`);
    console.log(`Number of backend clients: ${backendClient ? 1 : 0}`);

    ws.on("message", (message) => {
      const data = message.toString("base64");
      const res = JSON.stringify({
        espId: espId,
        data: data
      });   

      console.log(`backend ready state: ${backendClient.readyState}`);
      if (backendClient && backendClient.readyState === WebSocket.OPEN) {
        backendClient.send(res);
      }
    });

    ws.on("error", (error) => {
      console.log(`Error: ${error}`);
    });

    ws.on("close", () => {
      espClients.delete(espId);
    });
  } else if (clientType === "backend") {
    backendClient = ws;

    console.log(`backend client ${backendClient}`);

    backendClient.on("message", (message) => {
      const data = JSON.parse(message);
      const esp32Id = data.esp32Id;

      console.log(`Received message from backend: ${JSON.stringify(data)}`);

      if (esp32Id && espClients.has(esp32Id)) {
        const espClient = espClients.get(esp32Id);

        console.log(`espClient ready state: ${espClient.readyState}`);

        if (espClient && espClient.readyState === WebSocket.OPEN) {
          espClient.send(JSON.stringify(data));
        }
      }
    });

    backendClient.on("error", (error) => {
      console.log(`Error: ${error}`);
    });

    backendClient.on("close", () => {
      backendClient = null;
    });
  } else {
    ws.close();
  }
});