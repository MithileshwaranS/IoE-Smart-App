/**
 * Get the API base URL dynamically
 * Uses window.location.hostname to support accessing from any IP/hostname
 */
export const getApiBaseUrl = () => {
  return `http://${window.location.hostname}:3001`;
};

/**
 * Get the WebSocket URL dynamically
 */
export const getWebSocketUrl = () => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.hostname}:3001`;
};
