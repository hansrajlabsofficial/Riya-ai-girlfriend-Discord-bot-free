import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { getUserData } from '../database/models/User.js';
import { GIFTS, formatMoney } from '../services/economyService.js';
import { RODS, getUserFishing } from '../services/fishingService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('inventory')
  .setDescription('View your fishing creel, catches, equipped rod tier, and luxury gifts!');

export const execute = async (interaction) => {
  try {
    await interaction.deferReply().catch(() => {});

    const user = interaction.user;
    const userDoc = await getUserData(user.id, interaction.guildId);

    // 1. Fishing Creel & Gear
    const fishing = getUserFishing(userDoc);
    const catches = fishing.catches || [];
    const rod = RODS[fishing.rod] || RODS.bamboo;

    const breakdown = {
      junk: { count: 0, val: 0 },
      common: { count: 0, val: 0 },
      rare: { count: 0, val: 0 },
      epic: { count: 0, val: 0 },
      legendary: { count: 0, val: 0 }
    };

    let totalCreelWorth = 0;
    for (const c of catches) {
      if (breakdown[c.tier]) {
        breakdown[c.tier].count++;
        breakdown[c.tier].val += (c.value || 0);
      }
      totalCreelWorth += (c.value || 0);
    }

    const heaviest = fishing.stats?.heaviestCatch;
    const heaviestText = heaviest
      ? `${heaviest.emoji} **${heaviest.name}** (\`${heaviest.weightKg.toFixed(1)}kg\` • **${formatMoney(heaviest.value)}**)`
      : '*No records yet*';

    // Recent catches list (up to 8)
    let catchesPreview = '*Your fishing basket is currently empty! Use `/fish` to cast your line.*';
    if (catches.length > 0) {
      const recent = catches.slice(-8).reverse();
      catchesPreview = recent.map((c, i) =>
        `\`${i + 1}.\` ${c.emoji} **${c.name}** • \`${c.weightKg.toFixed(1)}kg\` • **${formatMoney(c.value)}** *(${c.tierName || c.tier})*`
      ).join('\n');
      if (catches.length > 8) {
        catchesPreview += `\n*... and ${catches.length - 8} more catches in basket.*`;
      }
    }

    // 2. Gifts & Other Items
    const giftInventory = userDoc.inventory || [];
    let giftText = '*No gifts owned yet. Visit `/shop` to buy sweet presents!*';
    if (giftInventory.length > 0) {
      const counts = {};
      giftInventory.forEach(item => {
        const key = item.giftId || item.id || item;
        counts[key] = (counts[key] || 0) + 1;
      });
      const lines = [];
      Object.entries(counts).forEach(([k, count]) => {
        const gift = GIFTS[k];
        if (gift) {
          lines.push(`${gift.emoji} **${gift.name}** ×${count}`);
        } else {
          lines.push(`🎁 **${k}** ×${count}`);
        }
      });
      if (lines.length > 0) giftText = lines.join(' • ');
    }

    const embed = new EmbedBuilder()
      .setColor('#3498DB')
      .setTitle(`🎒 ${user.username}'s Inventory & Fishing Creel`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        {
          name: '🎣 Equipped Rod & Gear',
          value:
            `Rod: ${rod.emoji} **${rod.name}**\n` +
            `Cooldown: \`${rod.cooldownSec}s\` • *${rod.desc}*`,
          inline: false
        },
        {
          name: '🧺 Creel Net Worth & Records',
          value:
            `💰 **Total Creel Worth:** **${formatMoney(totalCreelWorth)}** (${catches.length} items)\n` +
            `🏆 **Personal Best (Heaviest):** ${heaviestText}\n` +
            `📊 **Lifetime Catches:** **${fishing.stats?.totalCaught || catches.length}** | **Earnings:** **${formatMoney(fishing.stats?.totalEarnings || 0)}**`,
          inline: false
        },
        {
          name: '📦 Creel Tiers Breakdown',
          value:
            `• 👞 **Junk:** ${breakdown.junk.count} (${formatMoney(breakdown.junk.val)})\n` +
            `• 🐟 **Common:** ${breakdown.common.count} (${formatMoney(breakdown.common.val)})\n` +
            `• 🐙 **Rare:** ${breakdown.rare.count} (${formatMoney(breakdown.rare.val)})\n` +
            `• 🐬 **Epic:** ${breakdown.epic.count} (${formatMoney(breakdown.epic.val)})\n` +
            `• 🔱 **Legendary:** ${breakdown.legendary.count} (${formatMoney(breakdown.legendary.val)})`,
          inline: true
        },
        {
          name: '🎁 Luxury Gifts & Boosters',
          value: giftText,
          inline: true
        },
        {
          name: '🐟 Stored Catches in Creel',
          value: catchesPreview,
          inline: false
        }
      )
      .setFooter({ text: '© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`inv_to_fish_${user.id}`)
        .setLabel('Cast Line (/fish)')
        .setEmoji('🎣')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`inv_to_sell_${user.id}`)
        .setLabel('Market Counter (/sell)')
        .setEmoji('🏪')
        .setStyle(ButtonStyle.Success)
    );

    const replyMsg = await interaction.editReply({ embeds: [embed], components: [row] });

    const collector = replyMsg.createMessageComponentCollector({ time: 60000 });
    collector.on('collect', async (btnInt) => {
      try {
        if (btnInt.user.id !== user.id) {
          return await btnInt.reply({
            content: `❌ Only <@${user.id}> can use these shortcuts! Run \`/inventory\` for your own storage.`,
            ephemeral: true
          });
        }
        if (btnInt.customId.startsWith('inv_to_fish_')) {
          await btnInt.reply({ content: '🎣 Head out to the docks and type **/fish** to cast your rod!', ephemeral: true });
        } else if (btnInt.customId.startsWith('inv_to_sell_')) {
          await btnInt.reply({ content: '🏪 Head to the harbor merchant and type **/sell** to sell your catches!', ephemeral: true });
        }
      } catch (e) {}
    });

  } catch (error) {
    logger.error('Error executing /inventory command:', error);
    const errContent = '❌ Failed to fetch your inventory.';
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: errContent }).catch(() => {});
    } else {
      await interaction.reply({ content: errContent, ephemeral: true }).catch(() => {});
    }
  }
};
