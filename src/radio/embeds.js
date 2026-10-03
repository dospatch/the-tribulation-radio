const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const FOOTER = "📻 Tribulation Radio • Broadcasting 24/7";
const LIVE_TITLE = "📻 TRIBULATION RADIO IS LIVE!";
const LIVE_DESCRIPTION = "🔴 **WE ARE LIVE!**\n\n🎶 Welcome to **Tribulation Radio**!\n\nTurn up the volume and join us for music, entertainment, and nonstop broadcasting.\n\n🔊 **Join the \`📻 Tribulation Radio\` voice channel to listen live.**\n\n🎵 Want to hear something specific? Submit a request with \`/request\`.\n\n💬 Hang out with the community in **#radio-chat** and stay connected with the station.\n\n**Thanks for tuning in!**";

function baseEmbed(title, description) {
  return new EmbedBuilder().setTitle(title).setDescription(description).setFooter({ text: FOOTER }).setTimestamp();
}

function liveButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("radio_status").setLabel("Radio Status").setEmoji("📻").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("radio_request").setLabel("Request a Song").setEmoji("🎶").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("radio_listen").setLabel("Listen Live").setEmoji("🔊").setStyle(ButtonStyle.Secondary)
  );
}

function liveEmbed() {
  return baseEmbed(LIVE_TITLE, LIVE_DESCRIPTION).addFields(
    { name: "🟢 STATUS", value: "**LIVE • 24/7**", inline: true },
    { name: "🎵 NOW PLAYING", value: "Automatically updated", inline: true },
    { name: "🎶 REQUESTS", value: "Use \`/request\`", inline: true }
  );
}

function offlineEmbed() {
  return baseEmbed("📻 TRIBULATION RADIO", "🔴 **The station is currently offline.**\n\nWe're preparing the broadcast and will be back on the air as soon as possible. Thanks for listening!").addFields(
    { name: "🔴 STATUS", value: "OFFLINE", inline: true },
    { name: "🛠️ STATION", value: "Preparing broadcast", inline: true }
  );
}

function requestEmbed(user, song) {
  return baseEmbed("🎶 NEW SONG REQUEST", "A listener has submitted a new request.").addFields(
    { name: "👤 REQUESTED BY", value: String(user), inline: true },
    { name: "🎵 REQUEST", value: song.slice(0, 1024), inline: false }
  );
}

function announcementEmbed(title, message) {
  return baseEmbed("📢 " + title, message);
}

function panelEmbed() {
  return baseEmbed("📻 TRIBULATION RADIO", "Welcome to **Tribulation Radio** — your home for continuous radio entertainment.\n\nUse the buttons below to check the station or submit a song request.").addFields(
    { name: "🟢 LIVE RADIO", value: "Join the **Tribulation Radio** voice channel when the station is live.", inline: false },
    { name: "🎶 REQUESTS", value: "Use \`/request\` to send a song request to the radio team.", inline: false },
    { name: "📢 UPDATES", value: "Radio announcements and station updates will be posted here.", inline: false }
  );
}

module.exports = { liveEmbed, liveButtons, offlineEmbed, requestEmbed, announcementEmbed, panelEmbed };
