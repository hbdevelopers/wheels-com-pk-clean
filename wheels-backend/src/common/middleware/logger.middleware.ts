// backend/src/common/middleware/logger.middleware.ts
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const start = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - start;
      const color = statusCode >= 500 ? '\x1b[31m'  // red
        : statusCode >= 400 ? '\x1b[33m'             // yellow
        : statusCode >= 300 ? '\x1b[36m'             // cyan
        : '\x1b[32m';                                // green

      this.logger.log(
        `${color}${method}\x1b[0m ${originalUrl} ${statusCode} ${duration}ms — ${ip}`,
      );
    });

    next();
  }
}

// ─────────────────────────────────────────────────────────────
// backend/src/common/filters/http-exception.filter.ts

import {
  ExceptionFilter, Catch, ArgumentsHost,
  HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? (exception.getResponse() as any)?.message || exception.message
      : 'Internal server error';

    // Don't log 401/403 as errors (too noisy)
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      message: Array.isArray(message) ? message[0] : message,
      error: HttpStatus[status]?.replace(/_/g, ' ') || 'Error',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

// ─────────────────────────────────────────────────────────────
// backend/src/common/interceptors/transform.interceptor.ts
// Wraps all successful responses in { data, timestamp }

import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // If data is already wrapped or null, pass through
        if (data === null || data === undefined) return data;
        if (data?.data !== undefined && data?.meta !== undefined) return data; // pagination response
        return data;
      }),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// backend/src/config/app.config.ts

import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  env: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  adminUrl: process.env.ADMIN_URL || 'http://localhost:3002',
  webUrl: process.env.WEB_URL || 'http://localhost:3000',
  openaiKey: process.env.OPENAI_API_KEY,
  expoAccessToken: process.env.EXPO_ACCESS_TOKEN,
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM || 'wheels.com.pk <noreply@wheels.com.pk>',
}));

// ─────────────────────────────────────────────────────────────
// backend/src/config/database.config.ts

import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'wheels',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'wheels_db',
  ssl: process.env.DB_SSL === 'true',
  poolSize: parseInt(process.env.DB_POOL_SIZE || '20', 10),
}));
