  import { WebSocketServer, WebSocket } from "ws";

  const wss = new WebSocketServer({ port: process.env.PORT || 8080});

  const espClients = new Map();
  const frontendClients = new Map();
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
        if (message instanceof Buffer) {
          const data = message.toString("base64");

          const res = JSON.stringify({
            espId: espId,
            data: data,
          });   

          console.log(`backend ready state: ${backendClient.readyState}`);
          if (backendClient && backendClient.readyState === WebSocket.OPEN) {
            backendClient.send(res);
          }
        } else {
          const data = JSON.parse(message);

          const {destination, image} = data;
          const feClient = frontendClients.get(destination);

          console.log(`frontend ready state: ${feClient.readyState}`);
          if (feClient && feClient.readyState === WebSocket.OPEN) {
            feClient.send(image);
          }
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
    } else if (clientType === 'frontend') {
      const feId = req.headers['x-frontend-id'];
      frontendClients.set(feId, ws);

      console.log(`Number of frontend clients: ${frontendClients.size}`);

      ws.on("message", (message) => {
        const data = JSON.parse(message);
        const {destination} = data;
        const espClient = espClients.get(destination);

        console.log(`espClient ready state: ${espClient.readyState}`);

        if (espClient && espClient.readyState === WebSocket.OPEN) {
          espClient.send(JSON.stringify({
            destination: feId,
            message: 'capture'
          }));
        }
      });

      ws.on("error", (error) => {
        console.log(`Error: ${error}`);
      });

      ws.on("close", () => {
        frontendClients.delete(req.headers['x-frontend-id']);
      });

    } else {
      ws.close();
    }
  });