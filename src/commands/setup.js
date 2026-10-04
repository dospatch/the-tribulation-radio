const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits
} = require("discord.js");

const config = require("../config");
const { publishSetupPanel } = require("../radio/setup-panel");

const data = new SlashCommandBuilder()
  .setName("setup-radio")
  .setDescription("Create the Tribulation Radio Discord channels and role.")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;

  let role = guild.roles.cache.find(r => r.name === "Radio Staff");
  if (!role) {
    role = await guild.roles.create({
      name: "Radio Staff",
      reason: "Tribulation Radio setup"
    });
  }

  let category = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && c.name === "TRIBULATION RADIO"
  );

  if (!category) {
    category = await guild.channels.create({
      name: "TRIBULATION RADIO",
      type: ChannelType.GuildCategory,
      reason: "Tribulation Radio setup"
    });
  }

  async function textChannel(name, topic) {
    let channel = guild.channels.cache.find(
      c => c.parentId === category.id &&
           c.name === name &&
           c.type === ChannelType.GuildText
    );

    if (!channel) {
      channel = await guild.channels.create({
        name,
        type: ChannelType.GuildText,
        parent: category.id,
        topic,
        reason: "Tribulation Radio setup"
      });
    }

    return channel;
  }

  async function voiceChannel(name) {
    let channel = guild.channels.cache.find(
      c => c.parentId === category.id &&
           c.name === name &&
           c.type === ChannelType.GuildVoice
    );

    if (!channel) {
      channel = await guild.channels.create({
        name,
        type: ChannelType.GuildVoice,
        parent: category.id,
        reason: "Tribulation Radio setup"
      });
    }

    return channel;
  }

  const announcements = await textChannel(
    "radio-announcements",
    "Tribulation Radio announcements."
  );
  const nowPlaying = await textChannel(
    "now-playing",
    "Tribulation Radio status and now-playing information."
  );
  const requests = await textChannel(
    "song-requests",
    "Tribulation Radio song requests."
  );
  const chat = await textChannel(
    "radio-chat",
    "Tribulation Radio community chat."
  );
  const voice = await voiceChannel("Tribulation Radio");

  config.categoryId = category.id;
  config.announcementChannelId = announcements.id;
  config.statusChannelId = nowPlaying.id;
  config.requestChannelId = requests.id;
  config.chatChannelId = chat.id;
  config.voiceChannelId = voice.id;
  config.staffRoleId = role.id;
  config.save();

  await publishSetupPanel(interaction.client, config);

  return interaction.editReply(
    "Tribulation Radio channels, voice channel, Radio Staff role, and the station panel are ready."
  );
}

module.exports = { data, execute };
