import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

// Cache the server instance to avoid cold starts
let cachedServer: express.Express;

export default async (req: any, res: any) => {
  if (!cachedServer) {
    const server = express();
    const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

    // Basic configuration (simplified from app.factory.ts for serverless)
    app.use(helmet());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.enableCors();

    await app.init();
    cachedServer = server;
    console.log('🔧 Serverless function initialized');
  }

  // Handle request directly through Express
  cachedServer(req, res);
};
