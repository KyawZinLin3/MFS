import './telemetry.js';
import { buildApp } from './app.js';
import { ensureStorageBucket } from './modules/storage/storage.routes.js';

const app = await buildApp();
const port = Number(process.env.PORT ?? 4000);
try {
  await app.listen({ host: '0.0.0.0', port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

void (async () => {
  let attempt = 0;
  while (true) {
    attempt += 1;
    try {
      await ensureStorageBucket();
      app.log.info('Private file storage bucket is ready.');
      return;
    } catch (error) {
      const delayMs = Math.min(1000 * 2 ** Math.min(attempt - 1, 5), 30_000);
      app.log.warn({ err: error, attempt, retryInMs: delayMs }, 'File storage initialization failed; retrying.');
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
})();
