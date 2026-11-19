import { fileURLToPath } from "node:url";
import { config } from "dotenv";

export const environmentFile = fileURLToPath(
  new URL("../../../.env.local", import.meta.url),
);
config({ path: environmentFile, override: false });
