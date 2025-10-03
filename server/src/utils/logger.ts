import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

// Create logger instance
export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  transport: isProduction
    ? undefined // Use default JSON output in production
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Helper functions for common logging patterns
export const logRequest = (method: string, path: string, userId?: string) => {
  logger.info({ method, path, userId }, 'HTTP Request');
};

export const logError = (error: Error, context?: Record<string, any>) => {
  logger.error({ err: error, ...context }, error.message);
};

export const logVideoUpload = (videoId: string, userId: string, fileSize: number) => {
  logger.info({ videoId, userId, fileSize }, 'Video uploaded');
};

export const logVideoDelete = (videoId: string, userId: string) => {
  logger.info({ videoId, userId }, 'Video deleted');
};

export const logAuth = (action: string, username: string, success: boolean) => {
  logger.info({ action, username, success }, `Auth: ${action}`);
};

