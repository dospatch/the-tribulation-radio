require("dotenv").config({ override: true });
const fs = require("node:fs");
const path = require("node:path");

const dataDirectory = path.join(__dirname, "..", "data");
const dataFile = path.join(dataDirectory, "config.json");

if (!fs.existsSync(dataDirectory)) fs.mkdirSync(dataDirectory, { recursive: true });

let saved = {};
if (fs.existsSync(dataFile)) {
  try { saved = JSON.parse(fs.readFileSync(dataFile, "utf8")); } catch { saved = {}; }
}

const config = {
  token: (process.env.DISCORD_TOKEN || "").trim(),
  clientId: (process.env.CLIENT_ID || "").trim(),
  guildId: (process.env.GUILD_ID || "").trim(),
  streamUrl: saved.streamUrl || process.env.RADIO_STREAM_URL || "",
  voiceChannelId: saved.voiceChannelId || process.env.RADIO_VOICE_CHANNEL_ID || "",
  statusChannelId: saved.statusChannelId || process.env.RADIO_STATUS_CHANNEL_ID || "",
  staffRoleId: saved.staffRoleId || process.env.RADIO_STAFF_ROLE_ID || "",
  name: process.env.RADIO_NAME || "Tribulation Radio",
  volume: Math.min(100, Math.max(0, Number(saved.volume ?? process.env.RADIO_VOLUME ?? 80)))
};

config.save = function () {
  fs.writeFileSync(dataFile, JSON.stringify({
    streamUrl: config.streamUrl,
    voiceChannelId: config.voiceChannelId,
    statusChannelId: config.statusChannelId,
    staffRoleId: config.staffRoleId,
    volume: config.volume
  }, null, 2));
};

module.exports = config;
