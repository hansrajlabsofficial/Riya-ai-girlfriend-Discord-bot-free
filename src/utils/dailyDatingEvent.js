import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getTopUserOfGuild, activateDailyPartner } from '../services/rpgService.js';
import { getGuildConfig } from '../database/models/GuildConfig.js';
import { logger } from './logger.js';

/**
 * Triggers the automated daily dating invitation for the #1 Top XP User on the leaderboard
 */
export const triggerDailyDatingInvite = async (guild, client) => {
  try {
    const guildConfig = await getGuildConfig(guild.id);
    if (!guildConfig.boundChannelId) return;

    const channel = await guild.channels.fetch(guildConfig.boundChannelId).catch(() => null);
    if (!channel) return;

    // Get #1 Top XP User in the server
    const topUserDoc = await getTopUserOfGuild(guild.id);
    if (!topUserDoc) return;

    const embed = new EmbedBuilder()
      .setColor('#FF1493')
      .setTitle('👑 Daily Affection Leaderboard Champion!')
      .setDescription(
        `🎉 **CONGRATULATIONS!** <@${topUserDoc.userId}> is the **#1 Top Affection XP User** today with **${topUserDoc.xp} XP**!\n\n` +
        `Riya has noticed your dedication, Baka! 💖 She wants to invite you on an exclusive **24-Hour Special Date**!\n\n` +
        `Click **Approve & Start Date 💖** below to claim your **Special Dating TAG**: \`👑 Riya's Official Partner of the Day 💖\`!`
      )
      .setThumbnail(guild.iconURL({ dynamic: true }) || null)
      .setFooter({ text: 'Only the #1 Top XP User can approve this daily date! Valid for 24 Hours.' });

    const approveBtn = new ButtonBuilder()
      .setCustomId(`date_invite_approve_${topUserDoc.userId}`)
      .setLabel('Approve & Start Date 💖')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(approveBtn);

    const inviteMsg = await channel.send({ content: `🏆 Calling <@${topUserDoc.userId}>!`, embeds: [embed], components: [row] });

    // Handle button interaction
    const filter = i => i.customId === `date_invite_approve_${topUserDoc.userId}`;
    const collector = inviteMsg.createMessageComponentCollector({ filter, time: 86400000 }); // 24 hour collector

    collector.on('collect', async i => {
      if (i.user.id !== topUserDoc.userId) {
        return await i.reply({
          content: '❌ Only today\'s #1 Leaderboard Champion can approve this date invitation, Baka! Chat more to reach #1 tomorrow! ☕',
          ephemeral: true
        });
      }

      // Activate 24-hour partner tag
      const updatedUser = await activateDailyPartner(topUserDoc.userId, guild.id);

      const successEmbed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle('💖 OFFICIAL DATE ACTIVATED!')
        .setDescription(
          `🥰 <@${i.user.id}> approved the date!\n\n` +
          `Riya blushes brightly: *"Bov mast! You're my official partner for the next 24 hours, Baka!"* ☕💖🧿\n\n` +
          `**Special Dating TAG Granted:** \`${updatedUser.datingTag}\``
        )
        .setFooter({ text: 'Enjoy your 24-hour special date with Riya!' });

      approveBtn.setDisabled(true).setLabel('Date Approved & Active 💖');
      await inviteMsg.edit({ components: [new ActionRowBuilder().addComponents(approveBtn)] }).catch(() => {});

      await i.reply({ embeds: [successEmbed] });
      collector.stop();
    });

  } catch (error) {
    logger.error('Error triggering daily dating invite:', error);
  }
};
