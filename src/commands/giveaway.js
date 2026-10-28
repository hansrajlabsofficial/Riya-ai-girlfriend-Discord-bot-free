import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { parseDuration, startGiveaway } from '../services/giveawayService.js';
import { formatMoney } from '../services/economyService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('giveaway')
  .setDescription('Start a cash giveaway with timer, winning card, and role requirements!')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addIntegerOption(opt =>
    opt.setName('amount')
      .setDescription('Money amount ($) to give away to the winner')
      .setRequired(true)
      .setMinValue(1)
  )
  .addStringOption(opt =>
    opt.setName('duration')
      .setDescription('Timer duration (e.g. 30s, 5m, 1h, 1d)')
      .setRequired(true)
  )
  .addStringOption(opt =>
    opt.setName('description')
      .setDescription('Description or prize details')
      .setRequired(true)
  )
  .addStringOption(opt =>
    opt.setName('message')
      .setDescription('Additional custom announcement message')
      .setRequired(false)
  )
  .addRoleOption(opt =>
    opt.setName('required_role')
      .setDescription('Role required for users to participate in the giveaway')
      .setRequired(false)
  )
  .addChannelOption(opt =>
    opt.setName('channel')
      .setDescription('Channel ID / Target channel to post the giveaway in')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setRequired(false)
  );

export const execute = async (interaction) => {
  try {
    // Permission Check
    const hasPermission = interaction.member && (
      interaction.member.permissions.has(PermissionFlagsBits.ManageMessages) ||
      interaction.member.permissions.has(PermissionFlagsBits.Administrator) ||
      interaction.user.id === interaction.guild?.ownerId
    );

    if (!hasPermission) {
      return await interaction.reply({
        content: '❌ **Access Denied!** You need **Manage Messages** or **Administrator** permissions to start a giveaway!',
        ephemeral: true
      });
    }

    const amount = interaction.options.getInteger('amount');
    const durationStr = interaction.options.getString('duration');
    const description = interaction.options.getString('description');
    const customMessage = interaction.options.getString('message');
    const requiredRole = interaction.options.getRole('required_role');
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

    const durationMs = parseDuration(durationStr);
    if (!durationMs) {
      return await interaction.reply({
        content: '❌ **Invalid Duration Format!** Please use formats like `30s` (seconds), `5m` (minutes), `2h` (hours), or `1d` (days).',
        ephemeral: true
      });
    }

    if (durationMs < 10000) {
      return await interaction.reply({
        content: '❌ **Timer Too Short!** Minimum giveaway duration is 10 seconds.',
        ephemeral: true
      });
    }

    if (durationMs > 7 * 24 * 60 * 60 * 1000) {
      return await interaction.reply({
        content: '❌ **Timer Too Long!** Maximum giveaway duration is 7 days.',
        ephemeral: true
      });
    }

    const giveaway = await startGiveaway({
      interaction,
      amount,
      durationMs,
      description,
      customMessage,
      requiredRole,
      targetChannel
    });

    await interaction.reply({
      content: `✅ **Giveaway Successfully Started!**\n💰 **Prize:** ${formatMoney(amount)} Cash\n📢 Posted in <#${targetChannel.id}>!`,
      ephemeral: true
    });

  } catch (error) {
    logger.error('Error executing /giveaway command:', error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: '❌ Failed to start giveaway.', ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: '❌ Failed to start giveaway.', ephemeral: true }).catch(() => {});
    }
  }
};
