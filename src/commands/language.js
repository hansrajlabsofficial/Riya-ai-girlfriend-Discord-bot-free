import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getGuildConfig, saveGuildConfig } from '../database/models/GuildConfig.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('language')
  .setDescription('Command to change the bot language')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(opt =>
    opt.setName('lang')
      .setDescription('Select preferred language')
      .setRequired(true)
      .addChoices(
        { name: 'English 🇬🇧', value: 'en' },
        { name: 'Gujarati / Amdavadi 🇮🇳', value: 'gu' },
        { name: 'Hindi 🇮🇳', value: 'hi' }
      )
  );

export const execute = async (interaction) => {
  try {
    const lang = interaction.options.getString('lang');
    const guildConfig = await getGuildConfig(interaction.guildId);

    guildConfig.language = lang;
    await saveGuildConfig(guildConfig);

    const langName = lang === 'gu' ? 'Gujarati / Amdavadi Slang' : lang === 'hi' ? 'Hindi' : 'English';

    const embed = new EmbedBuilder()
      .setColor('#00FF7F')
      .setTitle('🌐 Language Preference Updated!')
      .setDescription(`✅ Successfully set bot language for this server to **${langName}**!`)
      .setFooter({ text: 'Riya Multi-Language Engine' });

    await interaction.reply({ embeds: [embed] });

  } catch (error) {
    logger.error('Error executing /language command:', error);
    await interaction.reply({ content: '❌ Failed to change language.', ephemeral: true });
  }
};
