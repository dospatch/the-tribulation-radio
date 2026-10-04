const {
  Client,
  GatewayIntentBits,
  ActivityType
} = require("discord.js");

const http = require("node:http");

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

const webPort = Number(process.env.PORT || 10431);
const webHost = "0.0.0.0";
const startedAt = new Date();

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

const webServer = http.createServer((request, response) => {
  const url = new URL(
    request.url || "/",
    "http://" + (request.headers.host || "localhost")
  );

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

      automation.channels.announcement = config.statusChannelId
        ? await client.channels.fetch(config.statusChannelId).catch(() => null)
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
