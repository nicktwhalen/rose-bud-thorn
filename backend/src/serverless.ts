import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';
import { createConfiguredApp } from './app.factory';

// Cache the server instance to avoid cold starts
let cachedServer: express.Express;

export default async (req: any, res: any) => {
  if (!cachedServer) {
    const server = express();
    const app = await createConfiguredApp(new ExpressAdapter(server));
    await app.init();
    cachedServer = server;
    console.log('🔧 Serverless function initialized');
  }

  // Use the Express app as a request handler
  return cachedServer(req, res);
};
