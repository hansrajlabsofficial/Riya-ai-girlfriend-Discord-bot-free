import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { getGuildConfig, saveGuildConfig } from '../database/models/GuildConfig.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('setup_global')
  .setDescription('Enable, disable, or set the designated Inter-Server Global Chat room')
  .addStringOption(opt =>
    opt.setName('action')
      .setDescription('Action: enable, disable, setchannel, unbind')
      .setRequired(false)
      .addChoices(
        { name: '✅ Enable Global Chat', value: 'enable' },
        { name: '❌ Disable Global Chat', value: 'disable' },
        { name: '📌 Set Global Chat Channel', value: 'setchannel' },
        { name: '🗑️ Unbind / Remove Channel', value: 'unbind' }
      )
  )
  .addChannelOption(opt =>
    opt.setName('channel')
      .setDescription('The text channel to use as Global Chat room')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false)
  );

export const execute = async (interaction) => {
  try {
    if (interaction.member?.permissions && !interaction.member.permissions.has(PermissionFlagsBits.Administrator) && !interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return await interaction.reply({
        content: '❌ **Administrator Permission Required!** Only server admins can configure the Global Chat room.',
        ephemeral: true
      });
    }

    let action = null;
    let targetChannel = null;

    if (interaction.options && typeof interaction.options.getString === 'function') {
      action = interaction.options.getString('action');
      targetChannel = interaction.options.getChannel('channel');
    }

    const guildConfig = await getGuildConfig(interaction.guildId);

    // 1. Action: DISABLE
    if (action === 'disable') {
      guildConfig.globalChatEnabled = false;
      await saveGuildConfig(guildConfig);

      const chanId = guildConfig.globalChatChannelId || interaction.channelId;
      const embed = new EmbedBuilder()
        .setColor('#FF4500')
        .setTitle('🌐 Global Chat Disabled')
        .setDescription(
          `❌ **Inter-Server Global Chat has been DISABLED for this server.**\n\n` +
          `Messages sent in <#${chanId}> will no longer broadcast globally.`
        )
        .setFooter({ text: 'Riya Global Inter-Server Network ☕✨' });

      return await interaction.reply({ embeds: [embed] });
    }

    // 2. Action: ENABLE
    if (action === 'enable') {
      const chan = targetChannel || (guildConfig.globalChatChannelId ? interaction.client?.channels?.cache?.get(guildConfig.globalChatChannelId) : null) || interaction.channel;
      guildConfig.globalChatChannelId = chan.id;
      guildConfig.globalChatEnabled = true;
      await saveGuildConfig(guildConfig);

      const embed = new EmbedBuilder()
        .setColor('#00FF7F')
        .setTitle('🌐 Global Chat ENABLED!')
        .setDescription(
          `✅ **Inter-Server Global Chat is now ENABLED & ACTIVE in <#${chan.id}>!**\n\n` +
          `💬 Any message sent in <#${chan.id}> will instantly broadcast to all linked Discord servers globally!`
        )
        .setFooter({ text: 'Riya Global Inter-Server Network ☕✨' });

      return await interaction.reply({ embeds: [embed] });
    }

    // 3. Action: UNBIND
    if (action === 'unbind') {
      const oldChanId = guildConfig.globalChatChannelId;
      guildConfig.globalChatChannelId = null;
      guildConfig.globalChatEnabled = false;
      await saveGuildConfig(guildConfig);

      const embed = new EmbedBuilder()
        .setColor('#FF4500')
        .setTitle('🌐 Global Chat Channel Unbound')
        .setDescription(`✅ Successfully removed Global Chat binding${oldChanId ? ` for <#${oldChanId}>` : ''}.`);

      return await interaction.reply({ embeds: [embed] });
    }

    // 4. Default / Action: SETCHANNEL
    const chan = targetChannel || interaction.channel;

    if (!action && guildConfig.globalChatChannelId === chan.id && !interaction.options?.getChannel('channel')) {
      if (guildConfig.globalChatEnabled !== false) {
        guildConfig.globalChatEnabled = false;
        await saveGuildConfig(guildConfig);
        const embed = new EmbedBuilder()
          .setColor('#FF4500')
          .setTitle('🌐 Global Chat Disabled')
          .setDescription(`❌ Disabled Global Chat for <#${chan.id}>. Run \`/setup_global action:enable\` to turn it back on.`);
        return await interaction.reply({ embeds: [embed] });
      } else {
        guildConfig.globalChatEnabled = true;
        await saveGuildConfig(guildConfig);
        const embed = new EmbedBuilder()
          .setColor('#00FF7F')
          .setTitle('🌐 Global Chat Re-Enabled!')
          .setDescription(`✅ Re-enabled Global Chat for <#${chan.id}>!`);
        return await interaction.reply({ embeds: [embed] });
      }
    }

    guildConfig.globalChatChannelId = chan.id;
    guildConfig.globalChatEnabled = true;
    await saveGuildConfig(guildConfig);

    const embed = new EmbedBuilder()
      .setColor('#00FF7F')
      .setTitle('🌐 Global Chat Channel Bound Successfully!')
      .setDescription(
        `✅ Successfully designated <#${chan.id}> as this server's official **Global Chat** room!\n\n` +
        `💬 **How it works:**\n` +
        `• Any message sent in <#${chan.id}> will instantly broadcast to all linked Discord servers globally!\n` +
        `• Images, text, and user avatars are automatically formatted in a clean broadcast embed.\n` +
        `• 3-second spam rate limiting protection is active.`
      )
      .setFooter({ text: 'Riya Global Inter-Server Network ☕✨' });

    return await interaction.reply({ embeds: [embed] });

  } catch (error) {
    logger.error('Error executing /setup_global command:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Failed to configure Global Chat room.', ephemeral: true }).catch(() => {});
    }
  }
};
