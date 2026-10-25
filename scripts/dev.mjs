// beforeDevCommand for `tauri dev`: starts Vite, or reuses the BeatShare dev
// server if one is already running on port 1430 (Vite's strictPort would fail).
import net from "node:net";
import { spawn } from "node:child_process";

const socket = net.connect({ port: 1430, host: "localhost" });

socket.once("connect", () => {
  socket.end();
  console.log("Reusing the dev server already running on http://localhost:1430");
});

socket.once("error", () => {
  spawn("npm", ["run", "dev"], { stdio: "inherit", shell: true }).on("exit", (code) => process.exit(code ?? 0));
});
