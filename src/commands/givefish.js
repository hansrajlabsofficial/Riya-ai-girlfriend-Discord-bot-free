import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserData, saveUserData } from '../database/models/User.js';
import { formatMoney } from '../services/economyService.js';
import { getUserFishing, FISHING_EMBLEM_URL } from '../services/fishingService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('givefish')
  .setDescription('Gift a caught fish or sea creature from your creel to a friend!')
  .addUserOption(opt =>
    opt.setName('target')
      .setDescription('The friend who will receive your fish')
      .setRequired(true)
  )
  .addStringOption(opt =>
    opt.setName('fish_name')
      .setDescription('Name of the fish to transfer (e.g. Golden Lobster, Megalodon)')
      .setRequired(true)
  );

export const execute = async (interaction) => {
  try {
    await interaction.deferReply().catch(() => {});

    const sender = interaction.user;
    const target = interaction.options.getUser('target');
    const rawFishName = interaction.options.getString('fish_name').trim();
    const guildId = interaction.guildId;

    // 1. Bot & Self checks
    if (target.bot) {
      return await interaction.editReply({
        content: '❌ **Invalid Target:** Bots do not have fishing baskets or creels to hold fish, baka!'
      });
    }

    if (target.id === sender.id) {
      return await interaction.editReply({
        content: '❌ **Nice try baka!** You cannot gift fish to yourself! Give it to a friend or sell it at **/sell**!'
      });
    }

    // 2. Fetch sender data and search creel
    const senderDoc = await getUserData(sender.id, guildId);
    const senderFishing = getUserFishing(senderDoc);
    const catches = senderFishing.catches;

    if (!catches || catches.length === 0) {
      return await interaction.editReply({
        content: `❌ **Empty Creel:** You don't have any fish in your storage! Go catch some with **/fish**!`
      });
    }

    // Find first item matching fish_name (case-insensitive)
    const targetQuery = rawFishName.toLowerCase();
    const foundIndex = catches.findIndex(c => 
      c.name.toLowerCase() === targetQuery || 
      c.name.toLowerCase().includes(targetQuery)
    );

    if (foundIndex === -1) {
      return await interaction.editReply({
        content: `❌ **Fish Not Found:** You do not own a "**${rawFishName}**" in your fishing creel!\nCheck your stored catches anytime using **/inventory**.`
      });
    }

    // 3. Update inventories
    const [giftedFish] = senderFishing.catches.splice(foundIndex, 1);

    const receiverDoc = await getUserData(target.id, guildId);
    const receiverFishing = getUserFishing(receiverDoc);
    receiverFishing.catches.push(giftedFish);

    await saveUserData(senderDoc);
    await saveUserData(receiverDoc);

    // 4. Send announcement embed
    const giftEmbed = new EmbedBuilder()
      .setColor('#00FF7F')
      .setTitle('🎁 Fish Gift Transfer Complete!')
      .setDescription(
        `Generosity at its finest! <@${sender.id}> just transferred a prized catch to <@${target.id}>! 💖\n\n` +
        `🐟 **Gifted Catch:** ${giftedFish.emoji} **${giftedFish.name}**\n` +
        `🏷️ **Rarity Tier:** **${giftedFish.tierName || giftedFish.tier.toUpperCase()}**\n` +
        `⚖️ **Weight:** **${giftedFish.weightKg.toFixed(1)} kg**\n` +
        `💰 **Market Worth:** **${formatMoney(giftedFish.value)}**\n\n` +
        `✨ *Amdavadi Riya says: "Dosti ho toh aisi! Take good care of this catch, baka!"* ☕`
      )
      .setThumbnail(FISHING_EMBLEM_URL)
      .setFooter({ text: '© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.' })
      .setTimestamp();

    await interaction.editReply({ embeds: [giftEmbed] });

  } catch (error) {
    logger.error('Error in /givefish command execution:', error);
    const errContent = '❌ An error occurred while transferring your fish. Please try again!';
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: errContent }).catch(() => {});
    } else {
      await interaction.reply({ content: errContent, ephemeral: true }).catch(() => {});
    }
  }
};
