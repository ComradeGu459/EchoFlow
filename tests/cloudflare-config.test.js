import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const root = process.cwd();

run("Cloudflare worker identity is consistent across package and wrangler config", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(root, "package.json"), "utf8"),
  );
  const wranglerConfig = fs.readFileSync(
    path.join(root, "wrangler.jsonc"),
    "utf8",
  );

  const nameMatch = wranglerConfig.match(/"name"\s*:\s*"([^"]+)"/);
  const serviceMatch = wranglerConfig.match(
    /"binding"\s*:\s*"WORKER_SELF_REFERENCE"[\s\S]*?"service"\s*:\s*"([^"]+)"/,
  );

  assert.ok(nameMatch, "wrangler.jsonc must define a worker name");
  assert.ok(serviceMatch, "wrangler.jsonc must define WORKER_SELF_REFERENCE");
  assert.equal(packageJson.name, "echoflowpro");
  assert.equal(nameMatch[1], "echoflowpro");
  assert.equal(serviceMatch[1], "echoflowpro");
});
