// WebSocket utility for real-time auction updates
import { getWebSocketUrl } from "./apiConfig";

export class AuctionWebSocketClient {
  constructor(auctionId, token) {
    this.auctionId = auctionId;
    this.token = token;
    this.ws = null;
    this.listeners = {};
    this.isConnecting = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = getWebSocketUrl();

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log("WebSocket connected to auction server");
          // Subscribe to auction
          this.send({
            type: "SUBSCRIBE",
            auctionId: this.auctionId,
            token: this.token,
          });
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log("WebSocket disconnected");
          this.emit("disconnect");
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  placeBid(bidAmount) {
    this.send({
      type: "BID_PLACED",
      auctionId: this.auctionId,
      bidAmount,
      token: this.token,
    });
  }

  ping() {
    this.send({ type: "PING" });
  }

  handleMessage(message) {
    console.log("WebSocket message:", message);
    this.emit(message.type, message);
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(
      (cb) => cb !== callback,
    );
  }

  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((callback) => callback(data));
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

export default AuctionWebSocketClient;
