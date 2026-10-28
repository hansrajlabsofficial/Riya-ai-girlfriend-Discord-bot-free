import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getGuildConfig, saveGuildConfig } from '../database/models/GuildConfig.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('settings')
  .setDescription('Command to show and edit bot settings for this server')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export const execute = async (interaction) => {
  try {
    const config = await getGuildConfig(interaction.guildId);

    const embed = new EmbedBuilder()
      .setColor('#9400D3')
      .setTitle('⚙️ Riya Server Settings Panel')
      .setDescription('Current active configuration for this server:')
      .addFields(
        { name: '💬 AI Chat Channel', value: config.boundChannelId ? `<#${config.boundChannelId}>` : '*Not Set (Use /select_channel)*', inline: true },
        { name: '🧩 EmojiQuiz Channel', value: config.emojiquizChannelId ? `<#${config.emojiquizChannelId}>` : '*Not Set*', inline: true },
        { name: '📝 AntonymQuiz Channel', value: config.antonymquizChannelId ? `<#${config.antonymquizChannelId}>` : '*Not Set*', inline: true },
        { name: '🔢 Counting Channel', value: config.countingChannelId ? `<#${config.countingChannelId}>` : '*Not Set*', inline: true },
        { name: '🌐 Language', value: `\`${config.language || 'en'}\``, inline: true }
      )
      .setFooter({ text: 'Use /emojiquiz setchannel or /counting setchannel to configure!' });

    await interaction.reply({ embeds: [embed] });

  } catch (error) {
    logger.error('Error executing /settings command:', error);
    await interaction.reply({ content: '❌ Failed to fetch settings.', ephemeral: true });
  }
};
