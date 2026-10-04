const {
  Client,
  GatewayIntentBits,
  ActivityType
} = require("discord.js");

const http = require("node:http");
const crypto = require("node:crypto");

const config = require("./config");
const RadioPlayer = require("./radio/player");
const StationEngine = require("./radio/station");
const RequestQueue = require("./radio/requests");
const StationAutomation = require("./radio/automation");
const path = require("node:path");
const { liveEmbed, liveButtons } = require("./radio/embeds");

if (!config.token) {
  console.error("DISCORD_TOKEN is missing.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const radio = new RadioPlayer(client, config);
const requestQueue = new RequestQueue(path.join(__dirname, "..", "data", "requests.json"));

const station = new StationEngine({
  musicDir: path.join(__dirname, "..", "music"),
  stationIdDir: path.join(__dirname, "..", "station-ids"),
  announcementDir: path.join(__dirname, "..", "announcements"),
  volume: config.volume
});

station.onTrackStart = async track => {
  if (track.type === "request") {
    const request = requestQueue.findApprovedBySong(track.title);
    if (request) requestQueue.markPlayed(request.id);
  }
  const channel = config.statusChannelId
    ? await client.channels.fetch(config.statusChannelId).catch(() => null)
    : null;
  if (channel) {
    await channel.send({
      embeds: [{
        title: "🎵 NOW PLAYING",
        description: "**" + track.title + "**",
        fields: [
          { name: "📻 TYPE", value: track.type, inline: true },
          { name: "🟢 STATUS", value: "LIVE • 24/7", inline: true }
        ],
        footer: { text: "📻 Tribulation Radio • Broadcasting 24/7" },
        timestamp: new Date().toISOString()
      }]
    }).catch(() => {});
  }
};

const automation = new StationAutomation({
  station,
  requestQueue,
  channels: { announcement: null }
});

async function startStationAfterLibraryUpload() {
  if (!station.getStatus().running && !station.everStarted && station.getStatus().tracks > 0) {
    await station.start();
    automation.start();
    console.log("Auto-started Tribulation Radio after audio was detected.");
  }

  if (station.getStatus().running && config.voiceChannelId && !radio.getStatus().running) {
    config.streamUrl = "http://127.0.0.1:" + webPort + "/stream";
    config.save();
    await radio.start();
    console.log("Auto-started Discord voice after station audio was detected.");
  }

  await automation.tick();
}

station.onLibraryChange = async change => {
  console.log(
    "Station library:",
    change.musicCount + " music, " +
    change.stationIds + " station IDs, " +
    change.announcements + " announcements"
  );

  await startStationAfterLibraryUpload();
};

const webPort = Number(process.env.PORT || 10431);
const webHost = "0.0.0.0";
const startedAt = new Date();


const dashboardSessions = new Map();
const DASHBOARD_PASSWORD = String(process.env.DASHBOARD_PASSWORD || "").trim();

function htmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseCookies(request) {
  const header = request.headers.cookie || "";
  const cookies = {};
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return cookies;
}

function dashboardAuthorized(request) {
  const cookies = parseCookies(request);
  const token = cookies.tribulation_dashboard;
  if (!token) return false;
  const expires = dashboardSessions.get(token);
  if (!expires || expires < Date.now()) {
    dashboardSessions.delete(token);
    return false;
  }
  return true;
}

function renderDashboardLogin(message = "") {
  return "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Tribulation Radio • Dashboard Login</title><style>" +
    "body{margin:0;min-height:100vh;display:grid;place-items:center;background:#090d12;color:#f5f7fa;font-family:Arial}main{width:min(92%,420px);padding:30px;border:1px solid #27313d;border-radius:20px;background:#111820;box-sizing:border-box}h1{margin-top:0}input,button{width:100%;box-sizing:border-box;padding:13px;margin-top:10px;border-radius:10px;border:1px solid #344150;background:#0b1118;color:#fff}button{cursor:pointer;background:#1d6ee8;border:0;font-weight:700}.error{color:#ff8c8c;margin-top:12px}</style></head><body><main><h1>📻 Tribulation Radio</h1><p>Station dashboard login</p><form method=\"POST\" action=\"/?dashboard=login\"><input name=\"password\" type=\"password\" placeholder=\"Dashboard password\" required><button type=\"submit\">Sign In</button></form>" +
    (message ? "<div class=\"error\">" + htmlEscape(message) + "</div>" : "") +
    "</main></body></html>";
}

function renderDashboard() {
  const stationStatus = station.getStatus();
  const radioStatus = radio.getStatus();
  const field = (label, name, value, multiline = false) =>
    "<label>" + htmlEscape(label) + "<" + (multiline ? "textarea" : "input") +
    " name=\"" + name + "\" " + (multiline ? "rows=\"7\"" : "type=\"text\"") +
    ">" + htmlEscape(value) + (multiline ? "</textarea>" : "") + "</label>";

  return "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Tribulation Radio • Dashboard</title><style>" +
    ":root{color-scheme:dark}body{margin:0;background:#090d12;color:#f5f7fa;font-family:Arial,Helvetica,sans-serif}main{width:min(1100px,94%);margin:30px auto;padding:28px;box-sizing:border-box}.top{display:flex;justify-content:space-between;gap:20px;align-items:center;flex-wrap:wrap}h1{margin:0 0 6px}.muted{color:#9da9b6}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin:20px 0}.card{padding:18px;border:1px solid #27313d;border-radius:16px;background:#111820}.label{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#8995a3}.value{font-size:19px;font-weight:700;margin-top:6px}form.panel{padding:22px;border:1px solid #27313d;border-radius:16px;background:#111820}label{display:block;margin:15px 0;font-weight:700}input,textarea{display:block;width:100%;box-sizing:border-box;margin-top:7px;padding:12px;border-radius:10px;border:1px solid #344150;background:#0b1118;color:#fff;font:inherit}textarea{resize:vertical}button{padding:12px 18px;border:0;border-radius:10px;background:#1d6ee8;color:#fff;font-weight:700;cursor:pointer;margin:8px 8px 0 0}.secondary{background:#27313d}.notice{padding:13px 16px;border-radius:10px;background:#10251a;border:1px solid #245b38;color:#b8f1c8;margin:15px 0}.warning{padding:13px 16px;border-radius:10px;background:#2b2110;border:1px solid #66501f;color:#f4d99a;margin:15px 0}.section{margin-top:24px}.small{font-size:13px;color:#8e9aa8}a{color:#8fc2ff}</style></head><body><main>" +
    "<div class=\"top\"><div><h1>📻 Tribulation Radio Dashboard</h1><div class=\"muted\">Edit what your Discord station panel says after deployment.</div></div><a href=\"/\">← Status</a></div>" +
    (!DASHBOARD_PASSWORD ? "<div class=\"warning\">Dashboard is disabled because <b>DASHBOARD_PASSWORD</b> is not set in the hosting environment.</div>" : "") +
    "<div class=\"grid\"><div class=\"card\"><div class=\"label\">Bot</div><div class=\"value\">" + (client.isReady() ? "🟢 Online" : "🟡 Starting") + "</div></div><div class=\"card\"><div class=\"label\">Radio</div><div class=\"value\">" + (radioStatus.running ? "🟢 LIVE" : "🔴 OFFLINE") + "</div></div><div class=\"card\"><div class=\"label\">Now Playing</div><div class=\"value\">" + htmlEscape(stationStatus.currentTrack?.title || "Waiting for audio") + "</div></div><div class=\"card\"><div class=\"label\">Library</div><div class=\"value\">" + stationStatus.tracks + " music tracks</div></div></div>" +
    "<form class=\"panel\" method=\"POST\" action=\"/?dashboard=save\"><div class=\"section\"><h2>Discord Station Panel</h2>" +
    field("Station Name", "name", config.name) +
    field("Panel Title", "panelTitle", config.panelTitle) +
    field("Panel Message", "panelDescription", config.panelDescription, true) +
    field("Panel Footer", "panelFooter", config.panelFooter) +
    "<h3>Discord Channel IDs</h3>" +
    field("Announcements Channel ID", "announcementChannelId", config.announcementChannelId) +
    field("Now Playing Channel ID", "statusChannelId", config.statusChannelId) +
    field("Song Requests Channel ID", "requestChannelId", config.requestChannelId) +
    field("Radio Chat Channel ID", "chatChannelId", config.chatChannelId) +
    field("Voice Channel ID", "voiceChannelId", config.voiceChannelId) +
    field("Radio Staff Role ID", "staffRoleId", config.staffRoleId) +
    "<h3>Station</h3>" + field("Volume (0-100)", "volume", config.volume) +
    "<button type=\"submit\">💾 Save Settings</button><button class=\"secondary\" type=\"submit\" name=\"publish\" value=\"1\">📢 Save & Publish Panel</button></form>" +
    "<p class=\"small\">The panel message is saved and edited instead of creating a new message every time. Changes are stored in <code>data/config.json</code>.</p>" +
    "</main></body></html>";
}

function parseFormBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) request.destroy();
    });
    request.on("end", () => resolve(new URLSearchParams(body)));
    request.on("error", reject);
  });
}

async function handleDashboard(request, response, url) {
  if (!DASHBOARD_PASSWORD) {
    response.writeHead(503, {"Content-Type":"text/html; charset=utf-8"});
    response.end(renderDashboard());
    return true;
  }

  if (request.method === "GET") {
    if (!dashboardAuthorized(request)) {
      response.writeHead(200, {"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"});
      response.end(renderDashboardLogin());
      return true;
    }
    response.writeHead(200, {"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"});
    response.end(renderDashboard());
    return true;
  }

  if (request.method === "POST" && url.searchParams.get("dashboard") === "login") {
    const form = await parseFormBody(request);
    if (form.get("password") !== DASHBOARD_PASSWORD) {
      response.writeHead(401, {"Content-Type":"text/html; charset=utf-8"});
      response.end(renderDashboardLogin("Incorrect dashboard password."));
      return true;
    }
    const token = crypto.randomBytes(32).toString("hex");
    dashboardSessions.set(token, Date.now() + 7 * 24 * 60 * 60 * 1000);
    response.writeHead(303, {"Location":"/?dashboard=1","Set-Cookie":"tribulation_dashboard="+token+"; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Strict"});
    response.end();
    return true;
  }

  if (request.method === "POST" && url.searchParams.get("dashboard") === "save") {
    if (!dashboardAuthorized(request)) {
      response.writeHead(303, {"Location":"/?dashboard=1"});
      response.end();
      return true;
    }
    const form = await parseFormBody(request);
    config.name = String(form.get("name") || "Tribulation Radio").trim().slice(0, 100);
    config.panelTitle = String(form.get("panelTitle") || "📻 TRIBULATION RADIO • LIVE STATION").trim().slice(0, 256);
    config.panelDescription = String(form.get("panelDescription") || "").trim().slice(0, 4000);
    config.panelFooter = String(form.get("panelFooter") || "📻 Tribulation Radio • Broadcasting 24/7").trim().slice(0, 2048);
    config.announcementChannelId = String(form.get("announcementChannelId") || "").trim();
    config.statusChannelId = String(form.get("statusChannelId") || "").trim();
    config.requestChannelId = String(form.get("requestChannelId") || "").trim();
    config.chatChannelId = String(form.get("chatChannelId") || "").trim();
    config.voiceChannelId = String(form.get("voiceChannelId") || "").trim();
    config.staffRoleId = String(form.get("staffRoleId") || "").trim();
    config.volume = Math.min(100, Math.max(0, Number(form.get("volume") || 80)));
    config.save();

    if (form.get("publish") === "1") {
      try {
        const { publishSetupPanel } = require("./radio/setup-panel");
        await publishSetupPanel(client, config);
      } catch (error) {
        console.error("Dashboard panel publish error:", error.message);
      }
    }

    response.writeHead(303, {"Location":"/?dashboard=1&saved=1"});
    response.end();
    return true;
  }

  response.writeHead(405, {"Content-Type":"text/plain; charset=utf-8","Allow":"GET, POST"});
  response.end("Method Not Allowed");
  return true;
}

function getWebStatus() {
  const status = radio.getStatus();
  const stationStatus = station.getStatus();

  return {
    service: "Tribulation Radio",
    status: "online",
    bot: client.isReady() ? "online" : "starting",
    radio: status.running ? "live" : "offline",
    voice: status.connected ? "connected" : "disconnected",
    stream: stationStatus.running ? "configured" : (status.streamConfigured ? "configured" : "not configured"),
    volume: status.volume,
    station: stationStatus,
    requests: { pending: requestQueue.pending().length, approved: requestQueue.approved().length },
    uptimeSeconds: Math.floor(process.uptime()),
    startedAt: startedAt.toISOString(),
    timestamp: new Date().toISOString()
  };
}

function renderStatusPage() {
  const status = radio.getStatus();
  const stationStatus = station.getStatus();
  const botOnline = client.isReady();
  const radioState = status.running ? "LIVE" : "OFFLINE";
  const radioIcon = status.running ? "🟢" : "🔴";
  const voiceState = status.connected ? "Connected" : "Disconnected";
  const streamState = stationStatus.running ? "Tribulation Radio Engine" : (status.streamConfigured ? "External stream" : "Waiting for station audio");

  return "<!doctype html>" +
    '<html lang="en"><head>' +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta http-equiv="refresh" content="30">' +
    '<title>Tribulation Radio • Status</title>' +
    '<style>' +
    ':root{color-scheme:dark;font-family:Arial,Helvetica,sans-serif}' +
    'body{margin:0;min-height:100vh;display:grid;place-items:center;background:#090d12;color:#f5f7fa}' +
    'main{width:min(92%,720px);box-sizing:border-box;padding:32px;border:1px solid #27313d;border-radius:20px;background:#111820;box-shadow:0 20px 60px rgba(0,0,0,.35)}' +
    'h1{margin:0 0 8px;font-size:32px}.subtitle{margin:0 0 28px;color:#aeb8c4}' +
    '.hero{padding:22px;border-radius:16px;background:#0b1118;border:1px solid #27313d;margin-bottom:20px}' +
    '.live{font-size:24px;font-weight:700;margin-bottom:8px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}' +
    '.card{padding:16px;border-radius:14px;background:#0b1118;border:1px solid #27313d}.label{color:#8e9aa8;font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:7px}' +
    '.value{font-size:17px;font-weight:700}footer{margin-top:24px;color:#7f8a96;font-size:13px;text-align:center}' +
    '</style></head><body><main>' +
    '<h1>📻 Tribulation Radio</h1>' +
    '<p><a href="/?dashboard=1" style="color:#8fc2ff">⚙️ Open Station Dashboard</a></p>' +
    '<p class="subtitle">Broadcasting 24/7 • Station Status</p>' +
    '<section class="hero"><div class="live">' + radioIcon + " " + radioState + '</div>' +
    '<div>' + (botOnline ? "Discord bot is online." : "Discord bot is starting.") + '</div></section>' +
    '<section class="grid">' +
    '<div class="card"><div class="label">Discord Bot</div><div class="value">' + (botOnline ? "🟢 Online" : "🟡 Starting") + '</div></div>' +
    '<div class="card"><div class="label">Radio</div><div class="value">' + radioState + '</div></div>' +
    '<div class="card"><div class="label">Station Engine</div><div class="value">' + (stationStatus.running ? "🟢 Broadcasting" : "🔴 Waiting") + '</div></div>' +
    '<div class="card"><div class="label">Now Playing</div><div class="value">' + (stationStatus.currentTrack ? stationStatus.currentTrack.title : "Waiting for audio") + '</div></div>' +
    '<div class="card"><div class="label">Voice</div><div class="value">' + voiceState + '</div></div>' +
    '<div class="card"><div class="label">Stream</div><div class="value">' + streamState + '</div></div>' +
    '<div class="card"><div class="label">Volume</div><div class="value">' + status.volume + '%</div></div>' +
    '<div class="card"><div class="label">Uptime</div><div class="value">' + Math.floor(process.uptime() / 60) + ' min</div></div>' +
    '</section><footer>📻 Tribulation Radio • Broadcasting 24/7</footer>' +
    '</main></body></html>';
}

const webServer = http.createServer(async (request, response) => {
  const url = new URL(
    request.url || "/",
    "http://" + (request.headers.host || "localhost")
  );

  const dashboardRequested =
    url.pathname === "/dashboard" ||
    (url.pathname === "/" && url.searchParams.get("dashboard") === "1") ||
    (url.pathname === "/" && url.searchParams.get("dashboard") === "login") ||
    (url.pathname === "/" && url.searchParams.get("dashboard") === "save");

  if (dashboardRequested) {
    await handleDashboard(request, response, url);
    return;
  }

  if (request.method !== "GET") {
    response.writeHead(405, {
      "Content-Type": "text/plain; charset=utf-8",
      "Allow": "GET"
    });
    response.end("Method Not Allowed");
    return;
  }

  const healthRequested =
    url.pathname === "/health" ||
    url.pathname === "/healthz" ||
    (url.pathname === "/" && url.searchParams.get("health") === "1");

  if (
    url.pathname === "/stream" ||
    (url.pathname === "/" && url.searchParams.get("stream") === "1")
  ) {
    station.addListener(response);
    return;
  }

  if (healthRequested) {
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    });
    response.end(JSON.stringify(getWebStatus(), null, 2));
    return;
  }

  if (url.pathname === "/" || url.pathname === "/status") {
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    });
    response.end(renderStatusPage());
    return;
  }

  response.writeHead(404, {
    "Content-Type": "text/plain; charset=utf-8"
  });
  response.end("Not Found");
});

webServer.on("error", error => {
  console.error("Web status server error:", error.message);
});

webServer.listen(webPort, webHost, () => {
  console.log("Tribulation Radio web status server listening on " + webHost + ":" + webPort);
});

client.once("ready", async () => {
  console.log("==============================================");
  console.log("TRIBULATION RADIO DISCORD BOT");
  console.log("Logged in as " + client.user.tag);
  console.log("==============================================");

  client.user.setPresence({
    activities: [
      {
        name: "Tribulation Radio • 24/7",
        type: ActivityType.Listening
      }
    ],
    status: "online"
  });

  try {
    if (!station.getStatus().running) {
      await station.start();
      automation.start();
      console.log("Auto-started Tribulation Radio station engine.");
    }

    if (config.voiceChannelId) {
      if (!config.streamUrl) {
        config.streamUrl = "http://127.0.0.1:" + webPort + "/stream";
      }

      await radio.start();
      console.log("Auto-started Discord voice broadcast.");

      const channel = config.statusChannelId
        ? await client.channels.fetch(config.statusChannelId).catch(() => null)
        : null;

      if (channel) {
        await channel
          .send({
            embeds: [liveEmbed()],
            components: [liveButtons()]
          })
          .catch(() => {});
      }

      automation.channels.announcement = config.announcementChannelId
        ? await client.channels.fetch(config.announcementChannelId).catch(() => null)
        : null;
    }
  } catch (error) {
    console.error("Auto-start failed:", error.message);
    console.log("Add your audio to music/, then use /radio start.");
  }
});

client.on("interactionCreate", async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "radio") {
        await require("./commands/radio").execute(
          interaction,
          radio,
          station,
          webPort,
          requestQueue
        );
      } else if (interaction.commandName === "request") {
        await require("./commands/request").execute(
          interaction,
          config,
          requestQueue
        );
      } else if (interaction.commandName === "setup-radio") {
        await require("./commands/setup").execute(
          interaction
        );
      }

      return;
    }

    if (!interaction.isButton()) {
      return;
    }

    if (interaction.customId === "radio_status") {
      const status = radio.getStatus();

      return interaction.reply({
        embeds: [
          {
            title: "📻 Tribulation Radio Status",
            description: status.running
              ? "🟢 The radio is currently running."
              : "🔴 The radio is currently stopped.",
            fields: [
              {
                name: "📻 VOICE",
                value: status.connected
                  ? "🟢 Connected"
                  : "🔴 Disconnected",
                inline: true
              },
              {
                name: "🎵 STREAM",
                value: status.streamConfigured
                  ? "🟢 Configured"
                  : "🟡 Waiting for stream",
                inline: true
              },
              {
                name: "🔊 VOLUME",
                value: status.volume + "%",
                inline: true
              }
            ],
            footer: {
              text:
                "📻 Tribulation Radio • 24/7"
            },
            timestamp: new Date().toISOString()
          }
        ],
        ephemeral: true
      });
    }

    if (interaction.customId === "radio_listen") {
      if (config.voiceChannelId) {
        return interaction.reply({
          content:
            "🔊 Join the configured **Tribulation Radio** voice channel to listen live.",
          ephemeral: true
        });
      }

      return interaction.reply({
        content:
          "🔴 The radio voice channel has not been configured yet.",
        ephemeral: true
      });
    }

    if (interaction.customId === "radio_request") {
      return interaction.reply({
        content:
          "🎶 To request a song, use **/request** and enter the song title and artist.",
        ephemeral: true
      });
    }
  } catch (error) {
    console.error(
      "Interaction error:",
      error
    );

    const response = {
      content:
        "❌ Something went wrong while processing that command.",
      ephemeral: true
    };

    if (
      interaction.replied ||
      interaction.deferred
    ) {
      await interaction
        .followUp(response)
        .catch(() => {});
    } else {
      await interaction
        .reply(response)
        .catch(() => {});
    }
  }
});

process.on(
  "unhandledRejection",
  error => {
    console.error(
      "Unhandled rejection:",
      error
    );
  }
);

process.on(
  "uncaughtException",
  error => {
    console.error(
      "Uncaught exception:",
      error
    );
  }
);

client.login(config.token);
