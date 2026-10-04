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
  announcementChannelId: saved.announcementChannelId || process.env.RADIO_ANNOUNCEMENT_CHANNEL_ID || "",
  requestChannelId: saved.requestChannelId || process.env.RADIO_REQUEST_CHANNEL_ID || "",
  chatChannelId: saved.chatChannelId || process.env.RADIO_CHAT_CHANNEL_ID || "",
  categoryId: saved.categoryId || process.env.RADIO_CATEGORY_ID || "",
  staffRoleId: saved.staffRoleId || process.env.RADIO_STAFF_ROLE_ID || "",
  setupMessageId: saved.setupMessageId || "",
  name: saved.name || process.env.RADIO_NAME || "Tribulation Radio",
  panelTitle: saved.panelTitle || "📻 TRIBULATION RADIO • LIVE STATION",
  panelDescription: saved.panelDescription || "🔴 **WE ARE LIVE!**\n\n🎶 Welcome to **Tribulation Radio** — your home for music, entertainment, and nonstop broadcasting.\n\n🔊 **Join the 📻 Tribulation Radio voice channel to listen live.**\n\n🎵 Want to hear something specific? Submit a request with **/request**.\n\n💬 Hang out with the community in **#radio-chat** and stay connected with the station.\n\n📢 Stay tuned for station updates, special broadcasts, and announcements.\n\n**Thanks for tuning in!**",
  panelFooter: saved.panelFooter || "📻 Tribulation Radio • Broadcasting 24/7",
  volume: Math.min(100, Math.max(0, Number(saved.volume ?? process.env.RADIO_VOLUME ?? 80)))
};

config.save = function () {
  fs.writeFileSync(dataFile, JSON.stringify({
    streamUrl: config.streamUrl,
    voiceChannelId: config.voiceChannelId,
    statusChannelId: config.statusChannelId,
    announcementChannelId: config.announcementChannelId,
    requestChannelId: config.requestChannelId,
    chatChannelId: config.chatChannelId,
    categoryId: config.categoryId,
    staffRoleId: config.staffRoleId,
    setupMessageId: config.setupMessageId,
    name: config.name,
    panelTitle: config.panelTitle,
    panelDescription: config.panelDescription,
    panelFooter: config.panelFooter,
    volume: config.volume
  }, null, 2));
};

module.exports = config;
