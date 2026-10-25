// Builds a signed BeatShare release that installed copies can update to.
//
//   npm run release -- 0.2.0 "What's new in this version"
//   npm run release -- --dry-run          (build the current version without bumping it)
//
// Bumps the version, builds the Windows installer signed with the updater key
// (~/.tauri/beatshare.key, or TAURI_SIGNING_PRIVATE_KEY), and writes latest.json
// next to it. Publish both files as a GitHub release tagged v<version>; every
// installed copy then offers the update.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO = "DonkableDoof/BeatShare";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const at = (...p) => path.join(root, ...p);
const fail = (msg) => {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
};

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const [wanted, notes = ""] = args.filter((a) => a !== "--dry-run");

const pkg = JSON.parse(fs.readFileSync(at("package.json"), "utf8"));
const current = pkg.version;
const version = dryRun ? current : wanted;

const newer = (a, b) => {
  const [x, y] = [a, b].map((v) => v.split(".").map(Number));
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};
if (!/^\d+\.\d+\.\d+$/.test(version || "")) fail(`Give the new version, e.g. npm run release -- 0.2.0   (current: ${current})`);
if (!dryRun && !newer(version, current)) fail(`${version} isn't newer than the current ${current}.`);

/* the Supabase keys are built into the app — without them it would ship in demo mode */
const env = fs.existsSync(at(".env")) ? fs.readFileSync(at(".env"), "utf8") : "";
if (!/^VITE_SUPABASE_URL=https:\/\/\S+/m.test(env) || !/^VITE_SUPABASE_ANON_KEY=\S{21,}/m.test(env))
  fail("Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env first.");

const keyFile = path.join(os.homedir(), ".tauri", "beatshare.key");
const signingKey = process.env.TAURI_SIGNING_PRIVATE_KEY || (fs.existsSync(keyFile) ? keyFile : "");
if (!signingKey) fail(`No updater signing key. Expected ${keyFile} (or set TAURI_SIGNING_PRIVATE_KEY).`);

if (!dryRun) {
  pkg.version = version;
  fs.writeFileSync(at("package.json"), JSON.stringify(pkg, null, 2) + "\n");
  const conf = JSON.parse(fs.readFileSync(at("src-tauri", "tauri.conf.json"), "utf8"));
  conf.version = version;
  fs.writeFileSync(at("src-tauri", "tauri.conf.json"), JSON.stringify(conf, null, 2) + "\n");
  const cargo = fs.readFileSync(at("src-tauri", "Cargo.toml"), "utf8");
  fs.writeFileSync(at("src-tauri", "Cargo.toml"), cargo.replace(/^version = "[^"]*"/m, `version = "${version}"`));
  console.log(`Version ${current} → ${version}`);
}

execSync("npx tauri build", {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    TAURI_SIGNING_PRIVATE_KEY: signingKey,
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD || "",
  },
});

const dir = at("src-tauri", "target", "release", "bundle", "nsis");
const installer = `BeatShare_${version}_x64-setup.exe`;
if (!fs.existsSync(path.join(dir, `${installer}.sig`))) fail(`The build didn't produce ${installer}.sig — is the signing key right?`);

const latest = {
  version,
  notes,
  pub_date: new Date().toISOString(),
  platforms: {
    "windows-x86_64": {
      signature: fs.readFileSync(path.join(dir, `${installer}.sig`), "utf8").trim(),
      url: `https://github.com/${REPO}/releases/download/v${version}/${installer}`,
    },
  },
};
fs.writeFileSync(path.join(dir, "latest.json"), JSON.stringify(latest, null, 2) + "\n");

if (dryRun) {
  console.log(`\n✔ Built and signed BeatShare ${version} (no version bump):\n    ${path.join(dir, installer)}\n`);
  process.exit(0);
}

console.log(`
✔ BeatShare ${version} is built and signed.

To publish it:
  1. Open https://github.com/${REPO}/releases/new?tag=v${version}&title=v${version}
  2. Attach these two files:
       ${path.join(dir, installer)}
       ${path.join(dir, "latest.json")}
  3. Click "Publish release" (leave it marked as the latest release).
  4. Commit and push the version bump (package.json, tauri.conf.json, Cargo.toml, Cargo.lock).

Installed copies of BeatShare will offer the update within a few hours, or straight away
from Settings → About & Updates → Check for Updates.
`);
