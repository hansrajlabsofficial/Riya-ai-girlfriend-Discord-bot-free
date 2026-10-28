import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getGlobalTopBankUsers } from '../database/models/User.js';
import { formatMoney, TOP_RANK_PERKS } from '../services/economyService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('globalbankbalance')
  .setDescription('View top 10 global bank accounts with tiered +2% to +0.05% reward perks!');

export const execute = async (interaction) => {
  await interaction.deferReply().catch(() => {});

  try {
    const topUsers = await getGlobalTopBankUsers(10);

    if (!topUsers || topUsers.length === 0) {
      return await interaction.editReply({ content: '📊 No global bank accounts found yet! Start earning cash to get on the leaderboard!' });
    }

    const rankEmojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

    const leaderboardLines = [];

    for (let i = 0; i < topUsers.length; i++) {
      const u = topUsers[i];
      const rankNum = i + 1;
      const rankEmoji = rankEmojis[i] || `#${rankNum}`;
      const wallet = u.balance !== undefined ? u.balance : 10000;
      const bank = u.bank || 0;
      const total = u.total || (wallet + bank);

      const perk = TOP_RANK_PERKS[rankNum] ? TOP_RANK_PERKS[rankNum].pct : '+0.05%';

      leaderboardLines.push(
        `${rankEmoji} <@${u.userId}> — **${formatMoney(total)}** *(Wallet: ${formatMoney(wallet)} | Bank: ${formatMoney(bank)})* ✨ **${perk} Extra Money Perk**`
      );
    }

    const embed = new EmbedBuilder()
      .setTitle('🌐 Global Bank Balance Leaderboard (Top 10)')
      .setColor('#FFD700')
      .setThumbnail('https://i.postimg.cc/63xkK4YM/HANSRAJ-AYAN-OFFICIAL-COMMUNITY-Global-Bank-discord-server.png')
      .setDescription(
        `🏆 **Top 10 Wealthiest Global Accounts**\n` +
        `⭐ **VIP Elite Perks**: All Top 10 players automatically earn **Extra Bonus Cash Perks** (+2% to +0.05%) on EVERY economy reward earned across all minigames & daily tasks!\n\n` +
        leaderboardLines.join('\n\n')
      )
      .setFooter({ text: 'Riya Global Banking & Financial Network ☕✨' });

    return await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    logger.error('Error executing /globalbankbalance command:', error);
    return await interaction.editReply({ content: '❌ Failed to fetch global bank balance leaderboard.' }).catch(() => {});
  }
};
