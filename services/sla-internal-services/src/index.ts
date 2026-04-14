import { buildApp } from "./app";
import { env } from "./config/env";
import { disconnectAllSources } from "./services/data-source-registry";

async function start() {
  const app = await buildApp();

  const close = async () => {
    await app.close();
    await disconnectAllSources();
    process.exit(0);
  };
  process.on("SIGINT", close);
  process.on("SIGTERM", close);

  await app.listen({
    host: env.host,
    port: env.port,
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
