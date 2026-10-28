import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserData } from '../database/models/User.js';
import { getBalance, formatMoney, GIFTS } from '../services/economyService.js';
import { getRelationshipTitle } from '../services/rpgService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('account')
  .setDescription('View account details, profile, inventory, or transaction logs!')
  .addUserOption(opt => opt.setName('user').setDescription('Target user (defaults to yourself)').setRequired(false));

export const execute = async (interaction) => {
  try {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const userDoc = await getUserData(targetUser.id, interaction.guildId);

    const balance = getBalance(userDoc);
    const title = getRelationshipTitle(userDoc.level || 1);
    const inventory = userDoc.inventory || [];
    const friendsCount = Object.keys(userDoc.friends || {}).length;

    let invSummary = 'No items in inventory yet.';
    if (inventory.length > 0) {
      const counts = {};
      inventory.forEach(item => {
        const key = item.giftId || item.id;
        counts[key] = (counts[key] || 0) + 1;
      });
      invSummary = Object.entries(counts)
        .map(([k, count]) => {
          const gift = GIFTS[k];
          return gift ? `${gift.emoji} **${gift.name}** x${count}` : `🎁 **${k}** x${count}`;
        })
        .join('\n');
    }

    const embed = new EmbedBuilder()
      .setColor('#FF1493')
      .setTitle(`💳 ${targetUser.username}'s Account & Profile`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '💰 Bank Balance', value: `**${formatMoney(balance)}**`, inline: true },
        { name: '🔥 Daily Streak', value: `**${userDoc.dailyStreak || 0} Days**`, inline: true },
        { name: '📊 Level & Title', value: `Level **${userDoc.level || 1}** (${userDoc.xp || 0} XP)\n\`${title}\``, inline: true },
        { name: '🤝 Friends Count', value: `**${friendsCount} Friends**`, inline: true },
        { name: '💍 Partner', value: userDoc.isDailyPartner ? "`👑 Riya's Partner of the Day`" : "`Riya 💕`", inline: true },
        { name: '🎁 Inventory Highlights', value: invSummary, inline: false }
      )
      .setFooter({ text: 'Riya Official Account Management System' });

    await interaction.reply({ embeds: [embed] });

  } catch (error) {
    logger.error('Error executing /account command:', error);
    await interaction.reply({ content: '❌ Failed to fetch account information.', ephemeral: true });
  }
};
