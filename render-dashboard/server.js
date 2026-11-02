const http = require("node:http");

const PORT = Number(process.env.PORT || 10000);
const STATUS_URL = String(process.env.RADIO_STATUS_URL || "https://tribulationradio.freesrv.com/?health=1").trim();
let cached = null;
let cachedAt = 0;
let lastError = null;

async function getRadioStatus() {
  if (cached && Date.now() - cachedAt < 15000) return { data: cached, error: lastError };
  try {
    const response = await fetch(STATUS_URL, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error("Radio host returned HTTP " + response.status);
    const data = await response.json();
    cached = data;
    cachedAt = Date.now();
    lastError = null;
    return { data, error: null };
  } catch (error) {
    lastError = error.message;
    return { data: cached, error: lastError };
  }
}

function esc(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function page(status, error) {
  const online = status && status.status === "online";
  const live = status && status.radio === "live";
  const station = status && status.station ? status.station : {};
  const track = station.currentTrack && station.currentTrack.title ? station.currentTrack.title : "Waiting for audio";
  const state = error && !status ? "Unable to reach radio host" : (online ? "Radio host reachable" : "Waiting for radio host");
  const color = online ? "#51d88a" : "#f4bd55";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="30"><title>Tribulation Radio • Live Status</title>
<style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at top,#152c4a,#080d16 55%);color:#f5f7fb;font-family:Arial,Helvetica,sans-serif}
main{width:min(960px,92%);margin:42px auto;padding:28px}header{padding:30px;border:1px solid #263b58;border-radius:22px;background:linear-gradient(135deg,#101e31,#111827);box-shadow:0 18px 55px #0006}
.brand{color:#83baff;font-weight:800;letter-spacing:.14em;font-size:13px}h1{font-size:clamp(30px,6vw,48px);margin:12px 0 8px}.sub{color:#aebdd0;margin:0}
.status{display:inline-flex;align-items:center;gap:9px;margin-top:22px;padding:10px 14px;border:1px solid #34445c;border-radius:999px;color:${color};font-weight:700}.dot{width:9px;height:9px;border-radius:50%;background:${color};box-shadow:0 0 12px ${color}}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px;margin:18px 0}.card{padding:20px;border:1px solid #26364b;border-radius:16px;background:#101a28}
.label{font-size:11px;color:#91a2b8;letter-spacing:.12em;text-transform:uppercase}.value{font-size:20px;font-weight:700;margin-top:9px;overflow-wrap:anywhere}
.note{margin-top:20px;color:#91a2b8;font-size:13px;line-height:1.6}a{color:#8fc4ff}footer{text-align:center;color:#718198;font-size:12px;margin-top:30px}
</style></head><body><main><header><div class="brand">📻 TRIBULATION RADIO • BROADCASTING 24/7</div><h1>Station Status</h1><p class="sub">Faith • Hope • Encouragement</p><div class="status"><span class="dot"></span>${esc(state)}</div></header>
<section class="grid">
<div class="card"><div class="label">Discord Bot</div><div class="value">${online ? "🟢 Online" : "⚪ Unknown"}</div></div>
<div class="card"><div class="label">Live Broadcast</div><div class="value">${live ? "🟢 LIVE" : "🔴 OFFLINE"}</div></div>
<div class="card"><div class="label">Voice Connection</div><div class="value">${esc(status?.voice || "Unknown")}</div></div>
<div class="card"><div class="label">Now Playing</div><div class="value">${esc(track)}</div></div>
<div class="card"><div class="label">Music Library</div><div class="value">${Number(station.tracks || 0)} tracks</div></div>
<div class="card"><div class="label">Station Volume</div><div class="value">${Number(status?.volume ?? station.volume ?? 0)}%</div></div>
<div class="card"><div class="label">Song Requests</div><div class="value">${Number(status?.requests?.pending || 0)} pending</div></div>
<div class="card"><div class="label">Listeners</div><div class="value">${Number(station.listeners || 0)}</div></div>
</section>
<p class="note">This Render page is a read-only status mirror. Radio playback and Discord controls remain on the main Wispbyte host. Render Free web services may sleep after 15 minutes without incoming traffic and can take about a minute to wake up.</p>
${error ? '<p class="note">Latest status check: ' + esc(error) + '</p>' : ""}
<p class="note">Main station: <a href="https://tribulationradio.freesrv.com/">tribulationradio.freesrv.com</a></p><footer>Tribulation Radio • Real Music, Real People, Real Faith</footer></main></body></html>`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://" + (req.headers.host || "localhost"));
  if (url.pathname === "/healthz") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true, service: "tribulation-radio-render-status" }));
    return;
  }
  if (url.pathname !== "/" && url.pathname !== "/status") {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not Found");
    return;
  }
  const result = await getRadioStatus();
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
  res.end(page(result.data, result.error));
});
server.listen(PORT, "0.0.0.0", () => console.log("Tribulation Radio Render status page listening on port " + PORT));
