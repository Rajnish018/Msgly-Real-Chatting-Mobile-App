// Socket.io Security Configuration - Add to backend/config/socketSecurity.ts
import { config } from './environment';
import { logger } from '../Utils/logger';

export const getSocketIOConfig = () => {
  return {
    cors: {
      origin: config.allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Authorization', 'Content-Type'],
      maxAge: 86400,
    },
    // Security configurations
    transports: ['websocket', 'polling'], // Prefer WebSocket over polling
    pingInterval: 25000,
    pingTimeout: 20000,
    maxHttpBufferSize: 1e6, // 1MB max message size
    connectTimeout: 45000,
    
    // Authentication
    auth: {
      // Handled in socket.io() middleware
    },
  };
};

// Socket authentication middleware
export const socketAuthMiddleware = (socket: any, next: any) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      logger.warn('Socket connection attempt without token', {
        socketId: socket.id,
        ip: socket.handshake.address,
      });
      return next(new Error('Authentication required'));
    }

    // Token will be verified in the actual auth middleware
    socket.token = token;
    next();
  } catch (error) {
    logger.error('Socket auth error', error as Error, {
      socketId: socket.id,
    });
    next(new Error('Authentication failed'));
  }
};

// Socket rate limiting to prevent flooding
export class SocketRateLimiter {
  private socketLimits: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly maxMessagesPerSecond: number = 10;
  private readonly checkInterval: number = 1000;

  constructor() {
    // Cleanup old entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [socketId, data] of this.socketLimits.entries()) {
        if (data.resetTime < now) {
          this.socketLimits.delete(socketId);
        }
      }
    }, 5 * 60 * 1000);
  }

  isAllowed(socketId: string): boolean {
    const now = Date.now();
    const limit = this.socketLimits.get(socketId);

    if (!limit || limit.resetTime < now) {
      this.socketLimits.set(socketId, {
        count: 1,
        resetTime: now + this.checkInterval,
      });
      return true;
    }

    if (limit.count < this.maxMessagesPerSecond) {
      limit.count++;
      return true;
    }

    return false;
  }

  reset(socketId: string): void {
    this.socketLimits.delete(socketId);
  }
}

export const socketRateLimiter = new SocketRateLimiter();
