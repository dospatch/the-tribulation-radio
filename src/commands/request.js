const { SlashCommandBuilder } = require("discord.js");
const { requestEmbed } = require("../radio/embeds");

const data = new SlashCommandBuilder()
  .setName("request")
  .setDescription("Send a song request to Tribulation Radio.")
  .addStringOption(o => o.setName("song").setDescription("Song and artist you want requested.").setRequired(true));

async function execute(interaction) {
  const song = interaction.options.getString("song", true);
  const embed = requestEmbed(interaction.user, song);

  const requestChannel = interaction.guild.channels.cache.find(
    ch => ch.name === "song-requests" && ch.isTextBased()
  );

  if (requestChannel) await requestChannel.send({ embeds: [embed] });

  return interaction.reply({
    content: requestChannel ? "🎶 Your request has been submitted: " + song : "Your request was received, but #song-requests could not be found.",
    ephemeral: true
  });
}

module.exports = { data, execute };
