const {
  Client,
  GatewayIntentBits,
  ActivityType
} = require("discord.js");

const config = require("./config");
const RadioPlayer = require("./radio/player");
const { liveEmbed } = require("./radio/embeds");

if (!config.token) {
  console.error("DISCORD_TOKEN is missing.");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

const radio = new RadioPlayer(client, config);

client.once("ready", async () => {
  console.log("==============================================");
  console.log("TRIBULATION RADIO DISCORD BOT");
  console.log("Logged in as " + client.user.tag);
  console.log("==============================================");

  client.user.setPresence({
    activities: [{ name: "Tribulation Radio • 24/7", type: ActivityType.Listening }],
    status: "online"
  });

  if (config.streamUrl && config.voiceChannelId) {
    try {
      await radio.start();
      console.log("Auto-started Tribulation Radio.");
      const channel = client.channels.cache.find(ch => ch.name === "radio-announcements" && ch.isTextBased());
      if (channel) await channel.send({ embeds: [liveEmbed()] }).catch(() => {});
    } catch (error) {
      console.error("Auto-start failed:", error.message);
    }
  } else {
    console.log("No stream URL/voice channel configured yet.");
    console.log("Use /setup-radio, then /radio stream and /radio start.");
  }
});

client.on("interactionCreate", async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "radio") {
        await require("./commands/radio").execute(interaction, radio);
      } else if (interaction.commandName === "request") {
        await require("./commands/request").execute(interaction, config);
      } else if (interaction.commandName === "setup-radio") {
        await require("./commands/setup").execute(interaction);
      }
      return;
    }

    if (!interaction.isButton()) return;

    if (interaction.customId === "radio_status") {
      const status = radio.getStatus();
      return interaction.reply({
        embeds: [{
          title: "📻 Tribulation Radio Status",
          description: status.running ? "🟢 The radio is currently running." : "🔴 The radio is currently stopped.",
          fields: [
            { name: "Stream", value: status.streamConfigured ? "🟢 Configured" : "🟡 Waiting for stream", inline: true },
            { name: "Voice", value: status.connected ? "🟢 Connected" : "🔴 Disconnected", inline: true },
            { name: "Volume", value: status.volume + "%", inline: true }
          ],
          footer: { text: "Tribulation Radio • 24/7" },
          timestamp: new Date().toISOString()
        }],
        ephemeral: true
      });
    }

    if (interaction.customId === "radio_request") {
      return interaction.reply({
        content: "🎶 To request a song, use **/request** and enter the song title and artist.",
        ephemeral: true
      });
    }
  } catch (error) {
    console.error("Interaction error:", error);
    const response = { content: "Something went wrong while processing that command.", ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(response).catch(() => {});
    } else {
      await interaction.reply(response).catch(() => {});
    }
  }
});

process.on("unhandledRejection", error => console.error("Unhandled rejection:", error));
process.on("uncaughtException", error => console.error("Uncaught exception:", error));

client.login(config.token);
