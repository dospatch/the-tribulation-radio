const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const data = new SlashCommandBuilder()
  .setName("request")
  .setDescription("Send a song request to Tribulation Radio.")
  .addStringOption(o => o.setName("song")
    .setDescription("Song and artist you want requested.")
    .setRequired(true));

async function execute(interaction, config) {
  const song = interaction.options.getString("song", true);

  const embed = new EmbedBuilder()
    .setTitle("New Song Request")
    .addFields(
      { name: "Requested By", value: String(interaction.user), inline: true },
      { name: "Request", value: song, inline: false }
    )
    .setFooter({ text: "Tribulation Radio" })
    .setTimestamp();

  const requestChannel = interaction.guild.channels.cache.find(
    ch => ch.name === "song-requests" && ch.isTextBased()
  );

  if (requestChannel) await requestChannel.send({ embeds: [embed] });

  return interaction.reply({
    content: "Your request has been submitted: " + song,
    ephemeral: true
  });
}

module.exports = { data, execute };
