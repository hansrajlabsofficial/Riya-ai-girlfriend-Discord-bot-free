import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('delete')
  .setDescription('Bulk delete messages from the current channel')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addIntegerOption(opt =>
    opt
      .setName('amount')
      .setDescription('Number of messages to delete (1-100)')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(100)
  )
  .addUserOption(opt =>
    opt
      .setName('user')
      .setDescription('Only delete messages sent by this specific user (optional)')
      .setRequired(false)
  );

export const execute = async (interaction) => {
  if (!interaction.guild) {
    return interaction.reply({ content: '❌ This command can only be used in a server!', ephemeral: true });
  }

  // 1. Permission check
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages) && !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: '❌ **Permission Denied:** You need the `Manage Messages` permission to use this command, baka!',
      ephemeral: true
    });
  }

  const botMember = interaction.guild.members.me;
  if (!botMember?.permissionsIn(interaction.channel)?.has(PermissionFlagsBits.ManageMessages)) {
    return interaction.reply({
      content: '❌ **Permission Error:** Riya does not have `Manage Messages` permission in this channel!',
      ephemeral: true
    });
  }

  const amount = interaction.options.getInteger('amount', true);
  const targetUser = interaction.options.getUser('user');

  await interaction.deferReply({ ephemeral: true }).catch(() => {});

  try {
    const fetchLimit = targetUser ? Math.min(amount * 3, 100) : amount;
    const fetched = await interaction.channel.messages.fetch({ limit: fetchLimit });

    let messagesToDelete = fetched;
    if (targetUser) {
      messagesToDelete = fetched.filter(m => m.author.id === targetUser.id);
      const ids = Array.from(messagesToDelete.keys()).slice(0, amount);
      messagesToDelete = fetched.filter(m => ids.includes(m.id));
    }

    // Filter out messages older than 14 days due to Discord API limitations
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const recentMessages = messagesToDelete.filter(m => m.createdTimestamp > twoWeeksAgo);

    if (recentMessages.size === 0) {
      return interaction.editReply({
        content: '⚠️ No messages were deleted. (Discord does not permit bulk-deleting messages older than 14 days).'
      });
    }

    const deleted = await interaction.channel.bulkDelete(recentMessages, true);

    const embed = new EmbedBuilder()
      .setTitle('🧹 Messages Deleted')
      .setDescription(
        `Successfully deleted **${deleted.size}** message${deleted.size > 1 ? 's' : ''} from <#${interaction.channel.id}>!` +
        (targetUser ? `\n👤 **Filtered by User:** ${targetUser}` : '')
      )
      .setColor(0x2ecc71)
      .setFooter({ text: '© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    return interaction.editReply({
      content: `❌ **Failed to delete messages:** \`${err.message}\``
    });
  }
};
