import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import * as express from 'express';
import { join, basename } from 'path';

async function bootstrap() {
  try {
    console.log('🟢 STARTING NEST...');

    const app = await NestFactory.create(AppModule);

    console.log('🟡 NEST FACTORY CREATED');

    // --------------------
    // Cookie Parser
    // --------------------
    app.use(cookieParser());

    // --------------------
    // CORS Configuration
    // --------------------
    app.enableCors({
      origin: (origin, callback) => {
        const allowedOrigins = [
          'http://localhost:5173',
          'http://localhost:4173',
          'http://localhost:5174',
          'https://abyinventory.com',
          'https://www.abyinventory.com',
          'https://api.abyinventory.com'
        ];

        // Allow requests with no origin (mobile apps, curl)
        if (!origin) return callback(null, true);

        // Allow if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // Deny other origins safely (do NOT throw Error)
        console.warn('⚠️ CORS DENIED:', origin);
        return callback(null, false);
      },
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

    // --------------------
    // JSON / URL-encoded parsing
    // --------------------
    app.use(json({ limit: '10mb' }));
    app.use(urlencoded({ extended: true, limit: '10mb' }));

    // --------------------
    // Static files for /uploads
    // --------------------
    app.use(
      '/uploads',
      express.static(join(__dirname, '..', 'uploads'), {
        setHeaders: (res, filePath) => {
          const fileName = basename(filePath);
          res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
          res.setHeader('Content-Type', 'application/octet-stream');
          res.setHeader('Cache-Control', 'public, max-age=31536000');
          res.setHeader(
            'Content-Security-Policy',
            "default-src 'self' data:; img-src 'self' data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
          );
          res.setHeader('Referrer-Policy', 'no-referrer');
          res.setHeader('Permissions-Policy', 'geolocation=(self), microphone=(), camera=()');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('X-XSS-Protection', '1; mode=block');
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        },
      }),
    );

    // --------------------
    // Start server
    // --------------------
    const port = process.env.PORT ?? 6000;
    await app.listen(port);
    console.log(`✅ SERVER RUNNING ON PORT ${port}`);
  } catch (err) {
    console.error('❌ BOOTSTRAP ERROR:', err);
    process.exit(1);
  }
}

bootstrap();
