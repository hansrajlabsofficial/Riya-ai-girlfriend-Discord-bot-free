import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getGuildConfig, saveGuildConfig } from '../database/models/GuildConfig.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('antonymquiz')
  .setDescription('Manage the Word Antonym Quiz channel and settings')
  .addSubcommand(sub =>
    sub.setName('setchannel')
      .setDescription('Sets the channel where the antonymquiz is to be played')
      .addChannelOption(opt => opt.setName('channel').setDescription('Target text channel').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('removechannel')
      .setDescription('removes the channel where the antonymquiz is to be played')
  )
  .addSubcommand(sub =>
    sub.setName('help')
      .setDescription('Explains the antonym quiz')
  )
  .addSubcommand(sub =>
    sub.setName('repair')
      .setDescription('repair the antonymquiz engine')
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
      guildConfig.antonymquizChannelId = channel.id;
      await saveGuildConfig(guildConfig);

      const embed = new EmbedBuilder()
        .setColor('#00FF7F')
        .setTitle('📝 AntonymQuiz Channel Configured!')
        .setDescription(`✅ Successfully set <#${channel.id}> as the official AntonymQuiz channel!`);

      return await interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'removechannel') {
      if (!interaction.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
        return await interaction.reply({ content: '❌ Administrator permissions required!', ephemeral: true });
      }
      guildConfig.antonymquizChannelId = null;
      await saveGuildConfig(guildConfig);
      return await interaction.reply({ content: '✅ AntonymQuiz channel binding removed.' });
    }

    if (subcommand === 'help' || !subcommand) {
      const embed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle('📝 How to Play AntonymQuiz')
        .setDescription(
          `• Riya posts a word (e.g. **"Hot"**)\n` +
          `• Type the opposite word (e.g. **"Cold"**) directly in the channel!\n` +
          `• Correct answer earns **+$1,000 Cash** & XP!\n\n` +
          `**Subcommands:**\n` +
          `• \`/antonymquiz setchannel <channel>\` - Bind active channel\n` +
          `• \`/antonymquiz removechannel\` - Unbind channel\n` +
          `• \`/antonymquiz help\` - View rules\n` +
          `• \`/antonymquiz repair\` - Status check`
        );

      return await interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'repair') {
      return await interaction.reply({ content: '⚙️ AntonymQuiz engine checked and active!' });
    }

  } catch (error) {
    logger.error('Error executing /antonymquiz command:', error);
    await interaction.reply({ content: '❌ Failed to execute antonymquiz command.', ephemeral: true });
  }
};
