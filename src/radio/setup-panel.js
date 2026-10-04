const { EmbedBuilder } = require("discord.js");

function buildSetupEmbed(config, channels, role) {
  return new EmbedBuilder()
    .setTitle(config.panelTitle)
    .setDescription(config.panelDescription)
    .addFields(
      { name: "📢 ANNOUNCEMENTS", value: String(channels.announcements), inline: true },
      { name: "🎵 NOW PLAYING", value: String(channels.nowPlaying), inline: true },
      { name: "🎶 REQUESTS", value: String(channels.requests), inline: true },
      { name: "🔊 VOICE", value: String(channels.voice), inline: true },
      { name: "🛡️ RADIO STAFF", value: String(role), inline: true }
    )
    .setFooter({ text: config.panelFooter })
    .setTimestamp();
}

async function publishSetupPanel(client, config) {
  if (!config.announcementChannelId) throw new Error("Announcement channel is not configured.");

  const announcements = await client.channels.fetch(config.announcementChannelId);
  if (!announcements || !announcements.isTextBased()) {
    throw new Error("Announcement channel could not be found.");
  }

  const resolve = async id => id ? await client.channels.fetch(id).catch(() => null) : null;
  const channels = {
    announcements: announcements,
    nowPlaying: await resolve(config.statusChannelId),
    requests: await resolve(config.requestChannelId),
    voice: await resolve(config.voiceChannelId)
  };
  const role = config.staffRoleId
    ? await announcements.guild.roles.fetch(config.staffRoleId).catch(() => null)
    : null;

  const payload = { embeds: [buildSetupEmbed(config, channels, role)] };

  if (config.setupMessageId) {
    const existing = await announcements.messages.fetch(config.setupMessageId).catch(() => null);
    if (existing) {
      await existing.edit(payload);
      return existing;
    }
  }

  const message = await announcements.send(payload);
  config.setupMessageId = message.id;
  config.save();
  return message;
}

module.exports = { buildSetupEmbed, publishSetupPanel };
