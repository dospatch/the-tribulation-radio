const { EmbedBuilder } = require("discord.js");

const FOOTER = "Tribulation Radio • 24/7";

function baseEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: FOOTER })
    .setTimestamp();
}

function liveEmbed() {
  return baseEmbed("📻 Tribulation Radio is LIVE", "The station is online and broadcasting. Join the **Tribulation Radio** voice channel and enjoy the broadcast.")
    .addFields(
      { name: "🎵 Status", value: "🟢 LIVE", inline: true },
      { name: "📡 Broadcast", value: "24/7", inline: true }
    );
}

function offlineEmbed() {
  return baseEmbed("📻 Tribulation Radio", "The station is currently offline or waiting for the radio stream to be configured.")
    .addFields(
      { name: "🔴 Status", value: "OFFLINE", inline: true },
      { name: "🛠️ Setup", value: "The stream is being prepared.", inline: true }
    );
}

function requestEmbed(user, song) {
  return baseEmbed("🎶 New Song Request", "A listener has submitted a new request.")
    .addFields(
      { name: "👤 Requested By", value: String(user), inline: true },
      { name: "🎵 Request", value: song.slice(0, 1024), inline: false }
    );
}

function announcementEmbed(title, message) {
  return baseEmbed("📢 " + title, message);
}

function panelEmbed() {
  return baseEmbed("📻 Tribulation Radio", "Welcome to Tribulation Radio — your home for continuous radio entertainment.\n\nUse the buttons below to check the station or submit a song request.")
    .addFields(
      { name: "🟢 LIVE RADIO", value: "When the stream is active, join the **Tribulation Radio** voice channel.", inline: false },
      { name: "🎶 REQUESTS", value: "Use `/request` to send a song request to the radio team.", inline: false },
      { name: "📢 UPDATES", value: "Radio announcements and station updates will be posted here.", inline: false }
    );
}

module.exports = { liveEmbed, offlineEmbed, requestEmbed, announcementEmbed, panelEmbed };
