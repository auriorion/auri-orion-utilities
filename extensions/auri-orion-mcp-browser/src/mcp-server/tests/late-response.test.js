// Late-response accounting: a tool that answers after the caller timed out must
// not vanish — connection_status.lateResponses records whether the action
// actually completed, so an agent can reconcile instead of blindly retrying.
// Run: node mcp-server/tests/late-response.test.js
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const exited = (child) =>
  child.exitCode !== null || child.signalCode !== null
    ? Promise.resolve()
    : new Promise((resolve) => child.once("exit", resolve));
const removeDir = (dir) =>
  fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "bsm-late-test-"));
const watchdog = setTimeout(() => { server.kill(); fake.kill(); removeDir(workDir); process.exit(1); }, 20000);
watchdog.unref();

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.join(HERE, "..", "index.js");
const FAKE = path.join(HERE, "fake-extension.js");
const PORT = 9788;

const failures = [];
const check = (name, cond, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!cond) failures.push(name);
};

const server = spawn(process.execPath, [SERVER], {
  cwd: workDir,
  env: {
    ...process.env,
    BSM_PORT: String(PORT),
    BSM_CONNECT_WAIT_MS: "800",
    BSM_KEEPALIVE_MS: "0",
    BSM_QUIET: "1",
    BSM_REQUEST_TIMEOUT_MS: "400",
  },
  stdio: ["pipe", "pipe", "pipe"],
});
server.stderr.on("data", (d) => process.stderr.write(`[server] ${d}`));

const fake = spawn(process.execPath, [FAKE, `ws://127.0.0.1:${PORT}`]);
fake.stderr.on("data", (d) => process.stderr.write(`[fake] ${d}`));

let rpcId = 0;
const pending = new Map();
function rpc(method, params) {
  const id = ++rpcId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    server.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
}
const call = (name, args) =>
  rpc("tools/call", { name, arguments: args }).then((res) => res.result);

server.stdout.setEncoding("utf8");
let buf = "";
server.stdout.on("data", (chunk) => {
  buf += chunk;
  let idx;
  while ((idx = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    const entry = msg.id !== undefined && pending.get(msg.id);
    if (!entry) continue;
    pending.delete(msg.id);
    entry.resolve(msg);
  }
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  await sleep(800); // WS server up + fake extension connected

  // A slow tool outlives the 400ms request timeout: the caller gets
  // RESPONSE_TIMEOUT, but the request id is kept for late reconciliation.
  const timedOut = await call("click", { ref: "#search", ms: 900 });
  check(
    "slow call surfaces RESPONSE_TIMEOUT",
    timedOut?.isError === true && /RESPONSE_TIMEOUT/.test(timedOut?.content?.[0]?.text ?? ""),
    timedOut?.content?.[0]?.text?.slice(0, 80),
  );
  check(
    "timeout error points at lateResponses",
    /lateResponses/.test(timedOut?.content?.[0]?.text ?? ""),
  );

  // No response has arrived yet, so nothing is recorded.
  const early = await call("connection_status", {});
  check(
    "no late response recorded before the reply arrives",
    (early?.structuredContent?.lateResponses ?? []).length === 0,
  );

  await sleep(900); // let the delayed answer land
  const after = await call("connection_status", {});
  const lates = after?.structuredContent?.lateResponses ?? [];
  check(
    "late success is recorded in connection_status",
    lates.some((r) => r.tool === "click" && r.outcome === "timed_out_late_success"),
    JSON.stringify(lates),
  );
  check(
    "late record carries reconciliation hint",
    lates.find((r) => r.tool === "click")?.nextAction === "observe_reconcile",
  );

  // A delayed error answer is classified differently from a delayed success.
  const timedOutErr = await call("click", { ref: "#search", ms: 900, fail: true });
  check("slow error also times out first", timedOutErr?.isError === true);
  await sleep(900);
  const afterErr = await call("connection_status", {});
  const lates2 = afterErr?.structuredContent?.lateResponses ?? [];
  check(
    "late error is recorded distinctly",
    lates2.some((r) => r.tool === "click" && r.outcome === "timed_out_late_error"),
    JSON.stringify(lates2),
  );
} catch (err) {
  check(`suite completed without exception (${err?.message ?? err})`, false);
} finally {
  server.kill();
  fake.kill();
  await Promise.all([exited(server), exited(fake)]);
  removeDir(workDir);
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log("\nAll checks passed.");
