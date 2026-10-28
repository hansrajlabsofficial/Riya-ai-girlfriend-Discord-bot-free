import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { getUserData, saveUserData } from '../database/models/User.js';
import { GIFTS, formatMoney, getBalance, deductBalance } from '../services/economyService.js';
import { RODS, getUserFishing, FISHING_EMBLEM_URL } from '../services/fishingService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('shop')
  .setDescription('View the official Rod Upgrade Store and Luxury Gift Boutique!')
  .addStringOption(opt =>
    opt.setName('category')
      .setDescription('View a specific section of the shop')
      .setRequired(false)
      .addChoices(
        { name: '🎣 Fishing Rod Upgrades', value: 'fishing' },
        { name: '🎁 Luxury Gifts & Boosters', value: 'gifts' }
      )
  );

export const execute = async (interaction) => {
  try {
    await interaction.deferReply().catch(() => {});

    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    const category = interaction.options.getString('category');

    const userDoc = await getUserData(userId, guildId);
    const fishing = getUserFishing(userDoc);
    const currentRodId = fishing.rod || 'bamboo';
    const currentRod = RODS[currentRodId] || RODS.bamboo;
    const userBalance = getBalance(userDoc);

    const buildShopEmbed = () => {
      const embed = new EmbedBuilder()
        .setColor('#FF1493')
        .setTitle('🏪 Riya Grand Market: Gear & Luxury Boutique')
        .setDescription(
          `Welcome to the store, <@${userId}>! Upgrade your fishing tackle to pull in huge ocean monsters, or buy gifts to win hearts! 💖\n\n` +
          `💳 **Your Wallet Balance:** **${formatMoney(userBalance)}**\n` +
          `🎣 **Currently Equipped Rod:** ${currentRod.emoji} **${currentRod.name}**\n`
        )
        .addFields(
          {
            name: '🎣 Fishing Rod Upgrades',
            value:
              `🎋 **Bamboo Stick** (Free / Starter)\n` +
              `• Cooldown: \`60s\` | Catch bonus: \`0%\` | ${currentRodId === 'bamboo' ? '✅ **Equipped**' : 'Owned'}\n\n` +
              `🎣 **Fiberglass Rod** — **${formatMoney(RODS.fiberglass.cost)}**\n` +
              `• Cooldown: \`45s\` | Drops junk rate by \`10%\` | ${currentRodId === 'fiberglass' ? '✅ **Equipped**' : ''}\n\n` +
              `🪙 **Carbon Pro Caster** — **${formatMoney(RODS.carbon_pro.cost)}**\n` +
              `• Cooldown: \`30s\` | \`+15%\` chance for Rare & Epic catches | ${currentRodId === 'carbon_pro' ? '✅ **Equipped**' : ''}\n\n` +
              `⚡ **Poseidon's Trident Rod** — **${formatMoney(RODS.poseidon_trident.cost)}**\n` +
              `• Cooldown: \`15s\` | \`3x chance\` for Legendary sea creatures! | ${currentRodId === 'poseidon_trident' ? '✅ **Equipped**' : ''}\n`
          },
          {
            name: '🎁 Luxury Affection Gifts',
            value:
              `💍 **Diamond Ring** — **${formatMoney(GIFTS.diamond_ring.price)}** (+1,000 XP)\n` +
              `🌹 **Red Flower** — **${formatMoney(GIFTS.red_flower.price)}** (+50 XP)\n` +
              `🧸 **Teddy Bear** — **${formatMoney(GIFTS.teddy_bear.price)}** (+20 XP)\n` +
              `*(Send gifts with \`/gift send <item> <user>\`)*`
          }
        )
        .setThumbnail(FISHING_EMBLEM_URL)
        .setFooter({ text: '© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.' })
        .setTimestamp();

      return embed;
    };

    const buildActionRow = () => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`buy_rod_fiberglass_${userId}`)
          .setLabel(`Buy Fiberglass (${formatMoney(RODS.fiberglass.cost)})`)
          .setEmoji('🎣')
          .setStyle(currentRodId === 'fiberglass' ? ButtonStyle.Secondary : ButtonStyle.Primary)
          .setDisabled(currentRodId === 'fiberglass' || userBalance < RODS.fiberglass.cost),
        new ButtonBuilder()
          .setCustomId(`buy_rod_carbon_pro_${userId}`)
          .setLabel(`Buy Carbon Pro (${formatMoney(RODS.carbon_pro.cost)})`)
          .setEmoji('🪙')
          .setStyle(currentRodId === 'carbon_pro' ? ButtonStyle.Secondary : ButtonStyle.Primary)
          .setDisabled(currentRodId === 'carbon_pro' || userBalance < RODS.carbon_pro.cost),
        new ButtonBuilder()
          .setCustomId(`buy_rod_poseidon_trident_${userId}`)
          .setLabel(`Buy Poseidon's Trident (${formatMoney(RODS.poseidon_trident.cost)})`)
          .setEmoji('⚡')
          .setStyle(currentRodId === 'poseidon_trident' ? ButtonStyle.Secondary : ButtonStyle.Success)
          .setDisabled(currentRodId === 'poseidon_trident' || userBalance < RODS.poseidon_trident.cost)
      );
    };

    const replyMsg = await interaction.editReply({
      embeds: [buildShopEmbed()],
      components: [buildActionRow()]
    });

    const collector = replyMsg.createMessageComponentCollector({
      time: 90000
    });

    collector.on('collect', async (btnInt) => {
      try {
        if (btnInt.user.id !== userId) {
          return await btnInt.reply({
            content: `❌ **Anti-Cheat:** Only <@${userId}> can purchase rods from this menu! Run \`/shop\` for your own store.`,
            ephemeral: true
          });
        }

        let targetRodKey = null;
        if (btnInt.customId.startsWith('buy_rod_fiberglass_')) targetRodKey = 'fiberglass';
        else if (btnInt.customId.startsWith('buy_rod_carbon_pro_')) targetRodKey = 'carbon_pro';
        else if (btnInt.customId.startsWith('buy_rod_poseidon_trident_')) targetRodKey = 'poseidon_trident';

        if (!targetRodKey) return;

        const targetRod = RODS[targetRodKey];
        const freshUserDoc = await getUserData(userId, guildId);
        const freshFishing = getUserFishing(freshUserDoc);
        const freshBalance = getBalance(freshUserDoc);

        if (freshFishing.rod === targetRodKey) {
          return await btnInt.reply({
            content: `✅ You already own and have equipped the **${targetRod.name}**!`,
            ephemeral: true
          });
        }

        if (freshBalance < targetRod.cost) {
          return await btnInt.reply({
            content: `❌ **Insufficient Funds!** You have **${formatMoney(freshBalance)}**, but need **${formatMoney(targetRod.cost)}** for the **${targetRod.name}**. Sell catches with \`/sell\` or work with \`/work\`!`,
            ephemeral: true
          });
        }

        // Deduct price and equip rod
        await deductBalance(freshUserDoc, targetRod.cost);
        freshFishing.rod = targetRodKey;
        await saveUserData(freshUserDoc);

        const successEmbed = new EmbedBuilder()
          .setColor('#00FF7F')
          .setTitle(`🎉 Gear Upgrade: ${targetRod.emoji} ${targetRod.name} Equipped!`)
          .setDescription(
            `Congratulations <@${userId}>! You purchased and equipped the **${targetRod.name}**! 🎣\n\n` +
            `💰 **Price Paid:** **-${formatMoney(targetRod.cost)}**\n` +
            `💳 **Remaining Balance:** **${formatMoney(getBalance(freshUserDoc))}**\n` +
            `⚡ **New Cooldown:** **${targetRod.cooldownSec} seconds**\n` +
            `✨ **Perk:** *${targetRod.desc}*\n\n` +
            `*Amdavadi Riya says: "Wah baka, look at this shiny rod! Go cast your line with \`/fish\` and reel in some sea monsters!"* 🌊`
          )
          .setThumbnail(FISHING_EMBLEM_URL)
          .setFooter({ text: '© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.' });

        await btnInt.update({
          embeds: [successEmbed],
          components: []
        });

        collector.stop('bought');
      } catch (shopErr) {
        logger.error('Error handling rod purchase button:', shopErr);
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
    logger.error('Error in /shop command execution:', error);
    const errContent = '❌ An error occurred while opening the shop. Please try again!';
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: errContent }).catch(() => {});
    } else {
      await interaction.reply({ content: errContent, ephemeral: true }).catch(() => {});
    }
  }
};
