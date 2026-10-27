const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const SNIPPET_URL = "https://raw.githubusercontent.com/ZenmoFeiShi/Qx/refs/heads/main/TxvideoAD.snippet";
const SCRIPT_URL = "https://raw.githubusercontent.com/ZenmoFeiShi/Qx/refs/heads/main/Txvideoad.js";
const STASH_SCRIPT = path.join(ROOT, "Stash", "txvideo-ad.stash.js");
const OVERRIDE = path.join(ROOT, "Stash", "TxvideoAD.stoverride");
const SNIPPET_SNAPSHOT = path.join(ROOT, "upstream", "TxvideoAD.snippet");
const SCRIPT_SNAPSHOT = path.join(ROOT, "upstream", "Txvideoad.js");
const STATE_FILE = path.join(ROOT, "upstream", ".sync-state.json");
const FORCE = process.argv.includes("--force");

function read(file, fallback = "") {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

function writeIfChanged(file, content) {
  const previous = read(file, null);
  if (previous === content) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
  return true;
}

async function fetchText(url) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      "User-Agent": "Rule-Hub-Txvideo-Sync",
    },
  });
  if (!response.ok) {
    throw new Error(`fetch ${url} failed: HTTP ${response.status}`);
  }
  return response.text();
}

function adapt(source) {
  const adapted = source
    .replace("  function toBuf(u) { return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength); }\n", "")
    .replace(/\$request\.bodyBytes/g, "$request.body")
    .replace(/\$response\.bodyBytes/g, "$response.body")
    .replace(/\{ bodyBytes: toBuf\(r\) \}/g, "{ body: r }");
  if (adapted.includes("bodyBytes") || adapted.includes("toBuf")) {
    throw new Error("QX bodyBytes/toBuf remains after adaptation");
  }
  return adapted;
}

function updateOverridePayload(script) {
  const text = read(OVERRIDE);
  const marker = "    payload: |\n";
  if (text.split(marker).length !== 2) {
    throw new Error("override must contain exactly one payload block");
  }
  const prefix = text.split(marker)[0];
  const next = prefix + marker + script.replace(/\n$/, "").split("\n").map((line) => "      " + line).join("\n") + "\n";
  if (writeIfChanged(OVERRIDE, next)) {
    console.log("updated Stash/TxvideoAD.stoverride payload");
  }
}

function updateState(state, now, upstreamHash, sourceChanged) {
  let changed = false;
  if (sourceChanged) {
    state.lastUpstreamSha256 = upstreamHash;
    state.lastSync = now;
    changed = true;
  }
  const last = state.lastHeartbeat ? new Date(state.lastHeartbeat + "T00:00:00Z") : null;
  if (!last || Number.isNaN(last.getTime()) || Date.now() - last.getTime() >= 30 * 24 * 60 * 60 * 1000) {
    state.lastHeartbeat = now.slice(0, 10);
    changed = true;
  }
  if (changed) {
    writeIfChanged(STATE_FILE, JSON.stringify(state, null, 2) + "\n");
  }
  return changed;
}

async function main() {
  const [snippet, upstream] = await Promise.all([fetchText(SNIPPET_URL), fetchText(SCRIPT_URL)]);
  const oldSnippet = read(SNIPPET_SNAPSHOT, "");

  if (snippet !== oldSnippet) {
    console.error("Upstream rule file changed. Manual review is required; no files were updated.");
    console.error("Review TxvideoAD.snippet, then update Stash/TxvideoAD.stoverride rules and this workflow.");
    process.exit(2);
  }

  const oldUpstream = read(SCRIPT_SNAPSHOT, "");
  const upstreamHash = crypto.createHash("sha256").update(upstream).digest("hex");
  const sourceChanged = FORCE || upstream !== oldUpstream;
  let state;
  try {
    state = JSON.parse(read(STATE_FILE, "{}"));
  } catch (error) {
    state = {};
  }

  if (sourceChanged) {
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const script = [
      "// Stash adaptation of ZenmoFeiShi/Qx Txvideoad.js",
      `// Upstream SHA256: ${upstreamHash}`,
      `// Synced at: ${now}`,
      "",
      adapt(upstream),
    ].join("\n").replace(/\n*$/, "\n");

    new vm.Script(script, { filename: "txvideo-ad.stash.js" });
    writeIfChanged(STASH_SCRIPT, script);
    updateOverridePayload(script);
    writeIfChanged(SCRIPT_SNAPSHOT, upstream);
    console.log(`synced upstream script (${upstreamHash.slice(0, 12)})`);
  } else {
    console.log("upstream script unchanged");
  }

  const stateChanged = updateState(state, new Date().toISOString(), upstreamHash, sourceChanged);
  if (!sourceChanged && !stateChanged) {
    console.log("no changes");
  }
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
