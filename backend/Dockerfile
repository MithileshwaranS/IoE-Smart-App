# Use official Node.js image
FROM node:18-alpine

# Set working directory inside container
WORKDIR /app

# Copy dependency files first (for caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source files
COPY . .

# Expose backend port
EXPOSE 3001

# Optional environment variable
ENV NODE_ENV=production

# ✅ Start your backend (since server.js is in /backend)
CMD ["node", "server.js"]
