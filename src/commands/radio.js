const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../config");
const { canControlRadio } = require("../permissions");
const {
  announcementEmbed,
  panelEmbed,
  liveEmbed,
  liveButtons,
  offlineEmbed
} = require("../radio/embeds");

const data = new SlashCommandBuilder()
  .setName("radio")
  .setDescription("Control Tribulation Radio.")
  .addSubcommand(s =>
    s
      .setName("start")
      .setDescription("Start the radio.")
  )
  .addSubcommand(s =>
    s
      .setName("stop")
      .setDescription("Stop the radio.")
  )
  .addSubcommand(s =>
    s
      .setName("restart")
      .setDescription("Restart the radio.")
  )
  .addSubcommand(s =>
    s
      .setName("status")
      .setDescription("Show radio status.")
  )
  .addSubcommand(s =>
    s
      .setName("volume")
      .setDescription("Set radio volume.")
      .addIntegerOption(o =>
        o
          .setName("level")
          .setDescription("Volume from 0 to 100.")
          .setRequired(true)
          .setMinValue(0)
          .setMaxValue(100)
      )
  )
  .addSubcommand(s =>
    s
      .setName("stream")
      .setDescription("Set the radio stream URL.")
      .addStringOption(o =>
        o
          .setName("url")
          .setDescription("Direct radio stream URL.")
          .setRequired(true)
      )
  )
  .addSubcommand(s =>
    s
      .setName("announce")
      .setDescription("Post a radio announcement embed.")
      .addStringOption(o =>
        o
          .setName("title")
          .setDescription("Announcement title.")
          .setRequired(true)
      )
      .addStringOption(o =>
        o
          .setName("message")
          .setDescription("Announcement message.")
          .setRequired(true)
      )
  )
  .addSubcommand(s =>
    s
      .setName("panel")
      .setDescription("Post the Tribulation Radio information panel.")
  );

async function execute(interaction, radio) {
  const subcommand = interaction.options.getSubcommand();

  if (
    !["status", "panel"].includes(subcommand) &&
    !canControlRadio(interaction, config)
  ) {
    return interaction.reply({
      content:
        "You need Administrator, Manage Server, or the Radio Staff role.",
      ephemeral: true
    });
  }

  const announcementChannel = interaction.guild.channels.cache.find(
    ch =>
      ch.name === "radio-announcements" &&
      ch.isTextBased()
  );

  if (subcommand === "start") {
    await interaction.deferReply({ ephemeral: true });

    try {
      await radio.start();

      if (announcementChannel) {
        await announcementChannel
          .send({
            embeds: [liveEmbed()],
            components: [liveButtons()]
          })
          .catch(() => {});
      }

      return interaction.editReply(
        "📻 Tribulation Radio is now LIVE."
      );
    } catch (error) {
      console.error("Radio start error:", error);

      return interaction.editReply(
        "❌ Error: " + error.message
      );
    }
  }

  if (subcommand === "stop") {
    radio.stop();

    if (announcementChannel) {
      await announcementChannel
        .send({
          embeds: [offlineEmbed()]
        })
        .catch(() => {});
    }

    return interaction.reply({
      content: "🔴 Tribulation Radio has been stopped.",
      ephemeral: true
    });
  }

  if (subcommand === "restart") {
    await interaction.deferReply({ ephemeral: true });

    try {
      await radio.restart();

      return interaction.editReply(
        "🔄 Tribulation Radio has restarted."
      );
    } catch (error) {
      console.error("Radio restart error:", error);

      return interaction.editReply(
        "❌ Error: " + error.message
      );
    }
  }

  if (subcommand === "volume") {
    const level = interaction.options.getInteger(
      "level",
      true
    );

    radio.setVolume(level);

    return interaction.reply({
      content:
        "🔊 Radio volume set to **" +
        level +
        "%**.",
      ephemeral: true
    });
  }

  if (subcommand === "stream") {
    const url = interaction.options
      .getString("url", true)
      .trim();

    try {
      new URL(url);
    } catch {
      return interaction.reply({
        content: "❌ That is not a valid URL.",
        ephemeral: true
      });
    }

    config.streamUrl = url;
    config.save();

    return interaction.reply({
      content:
        "✅ Radio stream URL saved.\n\n" +
        "Use **/radio start** to begin playback.",
      ephemeral: true
    });
  }

  if (subcommand === "announce") {
    if (!announcementChannel) {
      return interaction.reply({
        content:
          "❌ I could not find **#radio-announcements**.",
        ephemeral: true
      });
    }

    const title = interaction.options.getString(
      "title",
      true
    );

    const message = interaction.options.getString(
      "message",
      true
    );

    await announcementChannel.send({
      embeds: [
        announcementEmbed(title, message)
      ]
    });

    return interaction.reply({
      content:
        "📢 Your radio announcement was posted.",
      ephemeral: true
    });
  }

  if (subcommand === "panel") {
    const channel = interaction.guild.channels.cache.find(
      ch =>
        ch.name === "radio-chat" &&
        ch.isTextBased()
    );

    if (!channel) {
      return interaction.reply({
        content:
          "❌ I could not find **#radio-chat**.",
        ephemeral: true
      });
    }

    await channel.send({
      embeds: [panelEmbed()],
      components: [liveButtons()]
    });

    return interaction.reply({
      content:
        "📻 The Tribulation Radio LIVE station panel was posted.",
      ephemeral: true
    });
  }

  const status = radio.getStatus();

  const embed = new EmbedBuilder()
    .setTitle("📻 TRIBULATION RADIO • STATUS")
    .setDescription(
      status.running
        ? "🟢 **Tribulation Radio is currently LIVE.**"
        : "🔴 **Tribulation Radio is currently stopped.**"
    )
    .addFields(
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
          : "🟡 Not configured",
        inline: true
      },
      {
        name: "🔊 VOLUME",
        value: status.volume + "%",
        inline: true
      }
    )
    .setFooter({
      text:
        "📻 Tribulation Radio • Broadcasting 24/7"
    })
    .setTimestamp();

  return interaction.reply({
    embeds: [embed],
    ephemeral: true
  });
}

module.exports = {
  data,
  execute
};
