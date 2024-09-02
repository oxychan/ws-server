  import { WebSocketServer, WebSocket } from "ws";

  const wss = new WebSocketServer({ port: process.env.PORT || 8080});

  let espClient = null;
  let backendClient = null;

  wss.on("connection", (ws, req) => {
    console.log("New connection");
    const clientType = req.headers["sec-websocket-protocol"];

    if (clientType === "arduino") {
      espClient = ws;

      console.log(`Number of ESP32 clients: ${espClient ? 1 : 0}`);
      console.log(`Number of backend clients: ${backendClient ? 1 : 0}`);

      ws.on("message", (message) => {
        if (message instanceof Buffer) {
          const data = message.toString("base64");

          if (backendClient && backendClient.readyState === WebSocket.OPEN) {
            backendClient.send(data);
          }
        }
      });

      ws.on("error", (error) => {
        console.log(`Error: ${error}`);
      });

      ws.on("close", () => {
        espClient = null;
      });
    } else if (clientType === "backend") {
      backendClient = ws;

      console.log(`backend client ${backendClient}`);

      backendClient.on("message", (message) => {
        console.log(`Received message from backend: ${message}`);
        
        if (espClient && espClient.readyState === WebSocket.OPEN) {
          espClient.send(message);
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