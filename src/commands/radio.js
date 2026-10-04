const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
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
  )
  .addSubcommand(s =>
    s
      .setName("requests")
      .setDescription("View the current song request queue.")
  )
  .addSubcommand(s =>
    s
      .setName("approve")
      .setDescription("Approve a song request.")
      .addStringOption(o => o.setName("id").setDescription("Request ID.").setRequired(true))
  )
  .addSubcommand(s =>
    s
      .setName("reject")
      .setDescription("Reject a song request.")
      .addStringOption(o => o.setName("id").setDescription("Request ID.").setRequired(true))
  );

async function execute(interaction, radio, station, webPort, requestQueue) {
  const subcommand = interaction.options.getSubcommand();

  if (
    !["status", "panel", "requests"].includes(subcommand) &&
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
      config.streamUrl = "http://127.0.0.1:" + webPort + "/stream";
      config.save();

      if (!station.getStatus().running) {
        await station.start();
      }

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
    station.stop();

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
      config.streamUrl = "http://127.0.0.1:" + webPort + "/stream";
      config.save();

      await station.restart();
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
    station.setVolume(level);
    config.volume = level;
    config.save();

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

  if (subcommand === "requests") {
    const requests = requestQueue ? requestQueue.all(15) : [];
    const lines = requests.length
      ? requests.map(r => "`" + r.id + "` • " + r.status.toUpperCase() + " • " + r.song + " • <@" + r.userId + ">").join("\\n")
      : "No song requests yet.";

    return interaction.reply({
      content: "🎶 **Tribulation Radio Request Queue**\\n\\n" + lines,
      ephemeral: true
    });
  }

  if (subcommand === "approve" || subcommand === "reject") {
    const id = interaction.options.getString("id", true);

    if (!requestQueue) return interaction.reply({ content: "❌ Request queue is unavailable.", ephemeral: true });

    const request = subcommand === "approve" ? requestQueue.approve(id) : requestQueue.reject(id);
    if (!request) return interaction.reply({ content: "❌ Request ID not found.", ephemeral: true });

    if (subcommand === "approve") {
      const musicDir = path.join(__dirname, "..", "..", "music");
      const files = fs.existsSync(musicDir) ? fs.readdirSync(musicDir, { withFileTypes: true })
        .filter(entry => entry.isFile()).map(entry => path.join(musicDir, entry.name)) : [];
      const normalize = value => value.toLowerCase().replace(/[^a-z0-9]+/g, "");
      const wanted = normalize(request.song);
      const match = files.find(file => {
        const name = normalize(path.basename(file, path.extname(file)));
        return name && (name.includes(wanted) || wanted.includes(name));
      });

      if (match) {
        station.queueFile(match, "request");
        return interaction.reply({ content: "✅ Request approved and queued for rotation.\\n🎵 **" + request.song + "**", ephemeral: true });
      }

      return interaction.reply({ content: "✅ Request approved.\\n⚠️ No matching local audio file was found in `music/`.", ephemeral: true });
    }

    return interaction.reply({ content: "❌ Request rejected: **" + request.song + "**", ephemeral: true });
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
        value: station.getStatus().running
          ? "🟢 Tribulation Radio Engine"
          : (status.streamConfigured
            ? "🟢 Configured"
            : "🟡 Waiting for station audio"),
        inline: true
      },
      {
        name: "🎶 NOW PLAYING",
        value: station.getStatus().currentTrack
          ? station.getStatus().currentTrack.title.slice(0, 1024)
          : "Nothing playing",
        inline: false
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
