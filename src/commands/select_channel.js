import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { setBoundChannel } from '../database/models/GuildConfig.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('select_channel')
  .setDescription('Bind Riya (AI Girlfriend) chatting functionality to a specific channel.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .addChannelOption(option =>
    option
      .setName('channel')
      .setDescription('The text channel to bind Riya to')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  );

export const execute = async (interaction) => {
  const targetChannel = interaction.options.getChannel('channel');

  try {
    await setBoundChannel(interaction.guildId, targetChannel.id);
    logger.info(`Guild ${interaction.guildId} bound Riya chat to channel ${targetChannel.id}`);

    await interaction.reply({
      content: `💖 **Riya has been bound to ${targetChannel}!**\nSu chale chhe, Baka! I am now active, reacting to messages, and hanging out with you in this channel! ☕🎮✨`,
      ephemeral: false
    });
  } catch (error) {
    logger.error('Error executing /select_channel:', error);
    await interaction.reply({
      content: '❌ Failed to bind channel. Please check permissions.',
      ephemeral: true
    });
  }
};
