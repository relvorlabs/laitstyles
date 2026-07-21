
import pino from 'pino';

export const logger = pino({
  level: process.env.NEXT_PUBLIC_LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' 
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});
