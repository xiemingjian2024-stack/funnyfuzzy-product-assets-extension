import { createApp } from "./app.js";
import { loadServiceConfig } from "./config.js";
import { createFeishuClient } from "./feishuClient.js";

const config = loadServiceConfig();
const app = createApp({
  config,
  feishuClient: createFeishuClient(config)
});

app.listen(config.port, () => {
  console.log(`Product assets query service listening on http://localhost:${config.port}`);
});
