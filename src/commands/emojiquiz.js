import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getGuildConfig, saveGuildConfig } from '../database/models/GuildConfig.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('emojiquiz')
  .setDescription('Manage the interactive Emoji Word Quiz channel and settings')
  .addSubcommand(sub =>
    sub.setName('setchannel')
      .setDescription('Sets the channel where the emojiquiz is to be played')
      .addChannelOption(opt => opt.setName('channel').setDescription('Target text channel').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('removechannel')
      .setDescription('removes the channel where the emojiquiz is to be played')
  )
  .addSubcommand(sub =>
    sub.setName('settings')
      .setDescription('Opens the emojiquiz settings panel')
  )
  .addSubcommand(sub =>
    sub.setName('help')
      .setDescription('Explains the emoji quiz')
  )
  .addSubcommand(sub =>
    sub.setName('repair')
      .setDescription('repair the emojiquiz engine')
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
      guildConfig.emojiquizChannelId = channel.id;
      await saveGuildConfig(guildConfig);

      const embed = new EmbedBuilder()
        .setColor('#00FF7F')
        .setTitle('🧩 EmojiQuiz Channel Configured!')
        .setDescription(`✅ Successfully set <#${channel.id}> as the official EmojiQuiz channel! Riya will auto-post emoji puzzles here!`);

      return await interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'removechannel') {
      if (!interaction.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
        return await interaction.reply({ content: '❌ Administrator permissions required!', ephemeral: true });
      }
      guildConfig.emojiquizChannelId = null;
      await saveGuildConfig(guildConfig);
      return await interaction.reply({ content: '✅ EmojiQuiz channel binding removed.' });
    }

    if (subcommand === 'help' || !subcommand) {
      const embed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle('🧩 How to Play EmojiQuiz')
        .setDescription(
          `• Riya posts emoji word puzzles (e.g. \`👨‍💼✉️📦\` = **Postman**)\n` +
          `• Type your answer directly in the bound channel!\n` +
          `• First user to guess correctly receives **+$1,000 Cash** & XP!\n\n` +
          `**Subcommands:**\n` +
          `• \`/emojiquiz setchannel <channel>\` - Set game channel\n` +
          `• \`/emojiquiz removechannel\` - Unbind channel\n` +
          `• \`/emojiquiz help\` - View rules\n` +
          `• \`/emojiquiz settings\` - View status & repair`
        );

      return await interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'settings' || subcommand === 'repair') {
      const embed = new EmbedBuilder()
        .setColor('#9400D3')
        .setTitle('🧩 EmojiQuiz Status & Repair Panel')
        .setDescription(
          `• **Bound Channel:** ${guildConfig.emojiquizChannelId ? `<#${guildConfig.emojiquizChannelId}>` : '*None*'}\n` +
          `• **Status:** \`ACTIVE & RUNNING\` ✨`
        );

      return await interaction.reply({ embeds: [embed] });
    }

  } catch (error) {
    logger.error('Error executing /emojiquiz command:', error);
    await interaction.reply({ content: '❌ Failed to execute emojiquiz command.', ephemeral: true });
  }
};
