const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../config");
const { canControlRadio } = require("../permissions");

const data = new SlashCommandBuilder()
  .setName("radio")
  .setDescription("Control Tribulation Radio.")
  .addSubcommand(s => s.setName("start").setDescription("Start the radio."))
  .addSubcommand(s => s.setName("stop").setDescription("Stop the radio."))
  .addSubcommand(s => s.setName("restart").setDescription("Restart the radio."))
  .addSubcommand(s => s.setName("status").setDescription("Show radio status."))
  .addSubcommand(s => s.setName("volume").setDescription("Set radio volume.")
    .addIntegerOption(o => o.setName("level").setDescription("Volume from 0 to 100.")
      .setRequired(true).setMinValue(0).setMaxValue(100)))
  .addSubcommand(s => s.setName("stream").setDescription("Set the radio stream URL.")
    .addStringOption(o => o.setName("url").setDescription("Direct radio stream URL.")
      .setRequired(true)));

async function execute(interaction, radio) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand !== "status" && !canControlRadio(interaction, config)) {
    return interaction.reply({
      content: "You need Administrator, Manage Server, or the Radio Staff role.",
      ephemeral: true
    });
  }

  if (subcommand === "start") {
    await interaction.deferReply({ ephemeral: true });
    try {
      await radio.start();
      return interaction.editReply("Tribulation Radio is now LIVE.");
    } catch (error) {
      return interaction.editReply("Error: " + error.message);
    }
  }

  if (subcommand === "stop") {
    radio.stop();
    return interaction.reply({ content: "Tribulation Radio has been stopped.", ephemeral: true });
  }

  if (subcommand === "restart") {
    await interaction.deferReply({ ephemeral: true });
    try {
      await radio.restart();
      return interaction.editReply("Tribulation Radio has restarted.");
    } catch (error) {
      return interaction.editReply("Error: " + error.message);
    }
  }

  if (subcommand === "volume") {
    const level = interaction.options.getInteger("level", true);
    radio.setVolume(level);
    return interaction.reply({
      content: "Radio volume set to " + level + "%.",
      ephemeral: true
    });
  }

  if (subcommand === "stream") {
    const url = interaction.options.getString("url", true).trim();

    try {
      new URL(url);
    } catch {
      return interaction.reply({ content: "That is not a valid URL.", ephemeral: true });
    }

    config.streamUrl = url;
    config.save();

    return interaction.reply({
      content: "Radio stream URL saved. Use /radio start to begin playback.",
      ephemeral: true
    });
  }

  const status = radio.getStatus();

  const embed = new EmbedBuilder()
    .setTitle("Tribulation Radio Status")
    .setDescription(status.running ? "Radio is running" : "Radio is stopped")
    .addFields(
      { name: "Voice", value: status.connected ? "Connected" : "Disconnected", inline: true },
      { name: "Stream", value: status.streamConfigured ? "Configured" : "Not configured", inline: true },
      { name: "Volume", value: status.volume + "%", inline: true }
    )
    .setFooter({ text: "Tribulation Radio • 24/7" })
    .setTimestamp();

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { data, execute };
