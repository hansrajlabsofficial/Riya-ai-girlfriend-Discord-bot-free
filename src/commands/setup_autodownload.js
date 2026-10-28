import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } from 'discord.js';
import { getGuildConfig, saveGuildConfig } from '../database/models/GuildConfig.js';
import { logger } from '../utils/logger.js';

const BRAND_FOOTER = '© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.';
const EMBLEM_ICON = 'https://cdn.discordapp.com/attachments/1450771986031706214/1560613901396086904/Global_Fishing_Emblem_1.png?ex=6ad35a74&is=6ad208f4&hm=c0756eb02f2652d908a466b51026a18c45165dcdd6aad2abf5645b29728cf52c&';

export const data = new SlashCommandBuilder()
  .setName('setup_autodownload')
  .setDescription('Configure a channel for automatic media downloads (Instagram, YouTube, TikTok)')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addChannelOption(option =>
    option
      .setName('channel')
      .setDescription('Select the Discord channel for auto-downloading links')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setRequired(true)
  )
  .addBooleanOption(option =>
    option
      .setName('status')
      .setDescription('Enable or disable auto-downloading in this channel (default: True)')
      .setRequired(false)
  );

export const execute = async (interaction) => {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) && !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return await interaction.reply({
      content: '❌ **Permission Denied!** You need the **Manage Server** permission to configure auto-download channels, baka!',
      ephemeral: true
    });
  }

  const channel = interaction.options.getChannel('channel');
  const status = interaction.options.getBoolean('status') ?? true;

  try {
    const guildConfig = await getGuildConfig(interaction.guildId);
    guildConfig.autoDownloadChannelId = channel.id;
    guildConfig.autoDownloadEnabled = status;
    await saveGuildConfig(guildConfig);

    const embed = new EmbedBuilder()
      .setColor(status ? '#00FF88' : '#FF5555')
      .setTitle('📥 Auto-Downloader Channel Configured!')
      .setDescription(
        `Kem chhe! Media Auto-Downloader has been successfully updated for this server! ✨\n\n` +
        `• **Target Channel:** <#${channel.id}>\n` +
        `• **Status:** ${status ? '🟢 **Enabled & Active**' : '🔴 **Disabled**'}\n` +
        `• **Supported Platforms:** Instagram 📸, YouTube 🎥, TikTok 🎵\n\n` +
        `*Whenever someone posts an Instagram reel, TikTok video, or YouTube clip in <#${channel.id}>, Riya will automatically download and present the media smoothly!* 🚀`
      )
      .addFields(
        { name: '✨ How it works', value: '1. Paste any supported link in <#' + channel.id + '>\n2. Bot auto-downloads video/image\n3. Clutter-free preview posted instantly!' }
      )
      .setThumbnail(EMBLEM_ICON)
      .setFooter({ text: BRAND_FOOTER, iconURL: EMBLEM_ICON })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    logger.error(`Error in /setup_autodownload: ${err.message}`);
    await interaction.reply({
      content: '❌ Arey thodi problem aavi gayi baka! Could not save auto-download settings. Please try again.',
      ephemeral: true
    });
  }
};
