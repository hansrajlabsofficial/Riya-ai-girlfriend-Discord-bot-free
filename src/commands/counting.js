import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getGuildConfig, saveGuildConfig } from '../database/models/GuildConfig.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('counting')
  .setDescription('Manage the sequential Counting game channel')
  .addSubcommand(sub =>
    sub.setName('setchannel')
      .setDescription('Starts the counting game in a channel')
      .addChannelOption(opt => opt.setName('channel').setDescription('Target text channel').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('removechannel')
      .setDescription('remove the counting game channel')
  )
  .addSubcommand(sub =>
    sub.setName('help')
      .setDescription('Explains the counting game')
  );

export const execute = async (interaction) => {
  try {
    const subcommand = interaction.options.getSubcommand(false) || 'help';
    const guildConfig = await getGuildConfig(interaction.guildId);

    if (subcommand === 'setchannel') {
      if (!interaction.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
        return await interaction.reply({ content: '❌ Administrator permissions required!', ephemeral: true });
      }
      const channel = interaction.options.getChannel('channel');
      guildConfig.countingChannelId = channel.id;
      guildConfig.currentCountingNumber = 0;
      guildConfig.lastCountingUserId = null;
      await saveGuildConfig(guildConfig);

      const embed = new EmbedBuilder()
        .setColor('#00FF7F')
        .setTitle('🔢 Counting Game Active!')
        .setDescription(
          `✅ Successfully set <#${channel.id}> as the official Counting Game channel!\n\n` +
          `**Start by typing \`1\` in <#${channel.id}>!**`
        );

      return await interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'removechannel') {
      if (!interaction.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
        return await interaction.reply({ content: '❌ Administrator permissions required!', ephemeral: true });
      }
      guildConfig.countingChannelId = null;
      await saveGuildConfig(guildConfig);
      return await interaction.reply({ content: '✅ Counting game channel binding removed.' });
    }

    if (subcommand === 'help' || !subcommand) {
      const embed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle('🔢 How to Play Counting Game')
        .setDescription(
          `• Server members take turns counting upwards sequentially (\`1\`, \`2\`, \`3\`...)\n` +
          `• You cannot count twice in a row!\n` +
          `• Typing an incorrect number resets the count back to \`0\`!\n` +
          `• High streaks earn massive cash & XP rewards for everyone!\n\n` +
          `**Subcommands:**\n` +
          `• \`/counting setchannel <channel>\` - Bind counting channel\n` +
          `• \`/counting removechannel\` - Unbind channel\n` +
          `• \`/counting help\` - View rules`
        );

      return await interaction.reply({ embeds: [embed] });
    }

  } catch (error) {
    logger.error('Error executing /counting command:', error);
    await interaction.reply({ content: '❌ Failed to execute counting command.', ephemeral: true });
  }
};
