import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import * as express from 'express';
import { join } from 'path';
import { basename } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  
  // Enhanced CORS configuration
app.enableCors({
  origin: [
    process.env.CORS_ORIGIN,
    'http://localhost:5173',
    'http://localhost:4173',
    'https://abyinventory.com',
    'https://www.abyinventory.com'  // Add this
  ].filter(Boolean),
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-HTTP-Method-Override'
  ],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
});

  // Extended JSON parsing
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // Static file serving (removed conflicting CORS headers)
  app.use(
    '/uploads',
    express.static(join(__dirname, '..', 'uploads'), {
      setHeaders: (res, filePath) => {
        const fileName = basename(filePath);
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
        res.setHeader('Content-Security-Policy', "default-src 'self' data:; img-src 'self' data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';");
        res.setHeader('Referrer-Policy', 'no-referrer');
        res.setHeader('Permissions-Policy', 'geolocation=(self), microphone=(), camera=()');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        // Removed manual CORS headers to avoid conflicts
      },
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();