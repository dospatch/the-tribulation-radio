function canControlRadio(interaction, config) {
  if (!interaction.member) return false;
  const permissions = interaction.member.permissions;

  if (permissions && (permissions.has("Administrator") || permissions.has("ManageGuild"))) {
    return true;
  }

  return Boolean(
    config.staffRoleId &&
    interaction.member.roles &&
    interaction.member.roles.cache &&
    interaction.member.roles.cache.has(config.staffRoleId)
  );
}

module.exports = { canControlRadio };
