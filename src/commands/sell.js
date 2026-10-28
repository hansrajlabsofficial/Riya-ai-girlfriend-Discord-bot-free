import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { getUserData, saveUserData } from '../database/models/User.js';
import { addBalance, formatMoney } from '../services/economyService.js';
import { getUserFishing, sellCatches, RODS, FISHING_EMBLEM_URL } from '../services/fishingService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('sell')
  .setDescription('Open the Fish Market counter to sell catches or trash for instant coins!')
  .addStringOption(opt =>
    opt.setName('category')
      .setDescription('Choose which catches to sell immediately')
      .setRequired(false)
      .addChoices(
        { name: '👞 Sell Junk Only (Cleans out trash, keeps fish)', value: 'junk' },
        { name: '🐟 Sell Normal Fish (Common & Rare, keeps Epics/Mythics safe)', value: 'fish' },
        { name: '💰 Sell All Catches (Clears creel for maximum cash)', value: 'all' }
      )
  );

/**
 * Generates an overview of the player's fishing basket
 */
function getCreelBreakdown(catches) {
  const breakdown = {
    junk: { count: 0, val: 0 },
    common: { count: 0, val: 0 },
    rare: { count: 0, val: 0 },
    epic: { count: 0, val: 0 },
    legendary: { count: 0, val: 0 }
  };

  let totalWorth = 0;
  for (const c of catches) {
    if (breakdown[c.tier]) {
      breakdown[c.tier].count++;
      breakdown[c.tier].val += (c.value || 0);
    }
    totalWorth += (c.value || 0);
  }

  return { breakdown, totalWorth };
}

export const execute = async (interaction) => {
  try {
    await interaction.deferReply().catch(() => {});

    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    const categoryOption = interaction.options.getString('category');

    const userDoc = await getUserData(userId, guildId);
    const fishing = getUserFishing(userDoc);
    const catches = fishing.catches;

    // Helper to process sales
    const processSale = async (cat) => {
      const { soldCount, totalEarnings, soldItems, remainingCount } = sellCatches(userDoc, cat);

      if (soldCount === 0) {
        return {
          success: false,
          message: `❌ You don't have any items matching the **${cat.toUpperCase()}** category in your creel!`
        };
      }

      const newBal = await addBalance(userDoc, totalEarnings);
      await saveUserData(userDoc);

      const categoryTitles = {
        junk: '👞 Junk Clearance Completed',
        fish: '🐟 Normal Fish Sold (Epics/Mythics Protected)',
        all: '💰 Entire Creel Sold Out'
      };

      const receiptEmbed = new EmbedBuilder()
        .setColor('#00FF7F')
        .setTitle(categoryTitles[cat] || '💰 Fish Market Sale Complete')
        .setDescription(
          `Cha-ching! The harbor merchant bought your catches on the spot! 💵\n\n` +
          `📦 **Items Sold:** **${soldCount} catch${soldCount > 1 ? 'es' : ''}**\n` +
          `💵 **Revenue Earned:** **+${formatMoney(totalEarnings)}**\n` +
          `💳 **Updated Wallet Balance:** **${formatMoney(newBal)}**\n` +
          `🎒 **Remaining in Creel:** **${remainingCount} item${remainingCount === 1 ? '' : 's'}**\n\n` +
          `✨ *Amdavadi Riya says: "Badiya vyapar baka! Cast your line again with \`/fish\` to restock!"* ☕`
        )
        .setThumbnail(FISHING_EMBLEM_URL)
        .setFooter({ text: '© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.' })
        .setTimestamp();

      return { success: true, embed: receiptEmbed };
    };

    // If direct category option was provided
    if (categoryOption) {
      const result = await processSale(categoryOption);
      if (!result.success) {
        return await interaction.editReply({ content: result.message });
      }
      return await interaction.editReply({ embeds: [result.embed], components: [] });
    }

    // Interactive UI Mode: Show Market Counter & Action Buttons
    if (catches.length === 0) {
      const emptyEmbed = new EmbedBuilder()
        .setColor('#E74C3C')
        .setTitle('🏪 Fish Market Stall • Empty Basket')
        .setDescription(
          `Hey <@${userId}>, your fishing creel is currently empty!\n\n` +
          `🌊 Head over to the waters and cast your line with **/fish** to catch some seafood, or scavenge treasures!`
        )
        .setFooter({ text: '© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.' });

      return await interaction.editReply({ embeds: [emptyEmbed] });
    }

    const { breakdown, totalWorth } = getCreelBreakdown(catches);

    const marketEmbed = new EmbedBuilder()
      .setColor('#00CED1')
      .setTitle('🏪 Harborside Fish Market & Scavenge Counter')
      .setDescription(
        `Welcome to the harbor market counter, <@${userId}>!\n` +
        `The dock merchants are ready to buy your catches at today's rates.\n\n` +
        `🎒 **Total Catches Stored:** **${catches.length} items**\n` +
        `💰 **Total Creel Net Worth:** **${formatMoney(totalWorth)}**\n\n` +
        `**📦 Creel Inventory Breakdown:**\n` +
        `• 👞 **Junk / Trash:** ${breakdown.junk.count} items *(${formatMoney(breakdown.junk.val)})*\n` +
        `• 🐟 **Common Fish:** ${breakdown.common.count} items *(${formatMoney(breakdown.common.val)})*\n` +
        `• 🐙 **Rare Fish:** ${breakdown.rare.count} items *(${formatMoney(breakdown.rare.val)})*\n` +
        `• 🐬 **Epic Creatures:** ${breakdown.epic.count} items *(${formatMoney(breakdown.epic.val)})*\n` +
        `• 🔱 **Mythic / Legendary:** ${breakdown.legendary.count} items *(${formatMoney(breakdown.legendary.val)})*\n\n` +
        `👇 **Select a quick sale option below:**`
      )
      .setThumbnail(FISHING_EMBLEM_URL)
      .setFooter({ text: '© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.' })
      .setTimestamp();

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`sell_junk_${userId}_${Date.now()}`)
        .setLabel('Sell Junk Only')
        .setEmoji('👞')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(breakdown.junk.count === 0),
      new ButtonBuilder()
        .setCustomId(`sell_fish_${userId}_${Date.now()}`)
        .setLabel('Sell Normal Fish')
        .setEmoji('🐟')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(breakdown.common.count + breakdown.rare.count === 0),
      new ButtonBuilder()
        .setCustomId(`sell_all_${userId}_${Date.now()}`)
        .setLabel('Sell All Catches')
        .setEmoji('💰')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`sell_inv_${userId}_${Date.now()}`)
        .setLabel('Open Inventory')
        .setEmoji('📦')
        .setStyle(ButtonStyle.Secondary)
    );

    const replyMsg = await interaction.editReply({ embeds: [marketEmbed], components: [actionRow] });

    // Handle button collector
    const collector = replyMsg.createMessageComponentCollector({
      time: 60000
    });

    collector.on('collect', async (btnInt) => {
      try {
        // Anti-Cheat check
        if (btnInt.user.id !== userId) {
          return await btnInt.reply({
            content: `❌ **Anti-Cheat Warning:** Only <@${userId}> can manage this market stall! Run \`/sell\` to open your own.`,
            ephemeral: true
          });
        }

        // Open Inventory Button
        if (btnInt.customId.startsWith('sell_inv_')) {
          collector.stop('opened_inv');
          await btnInt.deferUpdate().catch(() => {});

          const rod = RODS[fishing.rod] || RODS.bamboo;
          const heaviest = fishing.stats?.heaviestCatch;
          const heaviestStr = heaviest 
            ? `${heaviest.emoji} **${heaviest.name}** (${heaviest.weightKg.toFixed(1)}kg • ${formatMoney(heaviest.value)})`
            : '*None recorded yet*';

          const invList = catches.slice(-10).map((c, idx) => 
            `\`${idx + 1}.\` ${c.emoji} **${c.name}** • \`${c.weightKg.toFixed(1)}kg\` • **${formatMoney(c.value)}** (${c.tierName})`
          ).join('\n') || '*Creel is empty*';

          const invEmbed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle(`🎒 ${interaction.user.username}'s Fishing Storage & Records`)
            .setDescription(
              `🎣 **Equipped Rod:** ${rod.emoji} **${rod.name}** *(Cooldown: ${rod.cooldownSec}s)*\n` +
              `💰 **Total Creel Net Worth:** **${formatMoney(totalWorth)}**\n` +
              `🏆 **Personal Best (Heaviest):** ${heaviestStr}\n` +
              `📊 **Total Lifetime Catches:** **${fishing.stats?.totalCaught || catches.length}**\n\n` +
              `**Recent Catches in Storage:**\n${invList}`
            )
            .setFooter({ text: '© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.' });

          return await interaction.editReply({ embeds: [invEmbed], components: [] });
        }

        collector.stop('sold');
        await btnInt.deferUpdate().catch(() => {});

        let chosenCategory = 'all';
        if (btnInt.customId.startsWith('sell_junk_')) chosenCategory = 'junk';
        else if (btnInt.customId.startsWith('sell_fish_')) chosenCategory = 'fish';

        const freshUserDoc = await getUserData(userId, guildId);
        const res = await processSale(chosenCategory);

        if (!res.success) {
          return await interaction.editReply({ content: res.message, components: [] });
        }

        await interaction.editReply({ embeds: [res.embed], components: [] });

      } catch (btnErr) {
        logger.error('Error handling sell button interaction:', btnErr);
      }
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'time') {
        try {
          await interaction.editReply({ components: [] }).catch(() => {});
        } catch (e) {}
      }
    });

  } catch (error) {
    logger.error('Error executing /sell command:', error);
    const errContent = '❌ An error occurred while opening the fish market. Please try again!';
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: errContent }).catch(() => {});
    } else {
      await interaction.reply({ content: errContent, ephemeral: true }).catch(() => {});
    }
  }
};
