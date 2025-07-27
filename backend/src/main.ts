import { createConfiguredApp } from './app.factory';

async function bootstrap() {
  const app = await createConfiguredApp();
  await app.listen(process.env.PORT || 3001);
  console.log(`🚀 Application is running on: ${await app.getUrl()}`);
}

bootstrap();
