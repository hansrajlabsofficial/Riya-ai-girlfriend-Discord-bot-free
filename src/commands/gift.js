import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserData, saveUserData } from '../database/models/User.js';
import { GIFTS, getBalance, deductBalance, formatMoney } from '../services/economyService.js';
import { addXp } from '../services/rpgService.js';
import { addFriendXp } from '../services/friendService.js';
import { fetchGif } from '../services/tenorService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('gift')
  .setDescription('Buy and send romantic or friendly gifts to Riya, your partner, or server friends!')
  .addSubcommand(sub =>
    sub.setName('send')
      .setDescription('Send a gift to Riya or a server user')
      .addStringOption(opt =>
        opt.setName('item')
          .setDescription('Select the gift to send')
          .setRequired(true)
          .addChoices(
            { name: '💍 Diamond Ring ($500,000)', value: 'diamond_ring' },
            { name: '🌹 Red Flower ($400)', value: 'red_flower' },
            { name: '🧸 Teddy Bear ($100)', value: 'teddy_bear' }
          )
      )
      .addUserOption(opt =>
        opt.setName('user')
          .setDescription('The partner/friend to receive the gift (leave empty to send to Riya)')
          .setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub.setName('store')
      .setDescription('View all available gifts in Riya\'s Gift Shop')
  );

export const execute = async (interaction) => {
  try {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'store') {
      const embed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle('🎁 Riya\'s Gift Shop Catalog')
        .setDescription('Surprise your partner, friends, or Riya with sweet gifts to boost affection and relationship level!')
        .addFields(
          { name: '💍 Diamond Ring', value: `**Price:** ${formatMoney(GIFTS.diamond_ring.price)}\n**Boost:** +1,000 XP\n*${GIFTS.diamond_ring.description}*`, inline: false },
          { name: '🌹 Red Flower', value: `**Price:** ${formatMoney(GIFTS.red_flower.price)}\n**Boost:** +50 XP\n*${GIFTS.red_flower.description}*`, inline: false },
          { name: '🧸 Teddy Bear', value: `**Price:** ${formatMoney(GIFTS.teddy_bear.price)}\n**Boost:** +20 XP\n*${GIFTS.teddy_bear.description}*`, inline: false }
        )
        .setFooter({ text: 'Use /gift send <item> <user> to send a gift!' });

      return await interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'send') {
      const giftKey = interaction.options.getString('item');
      const gift = GIFTS[giftKey];

      if (!gift) {
        return await interaction.reply({ content: '❌ Invalid gift selected.', ephemeral: true });
      }

      const senderDoc = await getUserData(interaction.user.id, interaction.guildId);

      if (!await deductBalance(senderDoc, gift.price)) {
        const currentBalance = getBalance(senderDoc);
        return await interaction.reply({
          content: `❌ **Insufficient Bank Balance!** You need **${formatMoney(gift.price)}** to buy a ${gift.emoji} **${gift.name}**, but you only have **${formatMoney(currentBalance)}**! 💸`,
          ephemeral: true
        });
      }

      const targetUser = interaction.options.getUser('user') || interaction.client.user;
      const isBot = targetUser.id === interaction.client.user.id;

      if (isBot) {
        // Gift to Riya
        addXp(senderDoc, gift.xpBoost);
        senderDoc.moodScore = Math.min(100, (senderDoc.moodScore || 50) + 15);
        await saveUserData(senderDoc);

        const gifSearch = giftKey === 'diamond_ring' ? 'wedding ring proposal' : giftKey === 'red_flower' ? 'rose love' : 'teddy bear hug';
        const gifUrl = await fetchGif(gifSearch);

        const embed = new EmbedBuilder()
          .setColor('#FF1493')
          .setTitle(`🎁 Special Gift Delivered to Riya!`)
          .setDescription(
            `<@${interaction.user.id}> presented Riya with a ${gift.emoji} **${gift.name}** (${formatMoney(gift.price)})!\n\n` +
            `Riya's eyes light up with tears of joy: *"Aww Baka! You bought this for me?! Bov sweet chho tame!"* 💖✨☕\n\n` +
            `**Affection Bonus:** +${gift.xpBoost} XP!`
          )
          .setImage(gifUrl)
          .setFooter({ text: `Remaining Balance: ${formatMoney(getBalance(senderDoc))}` });

        return await interaction.reply({ embeds: [embed] });
      } else {
        // Gift to another user (partner/friend)
        const recipientDoc = await getUserData(targetUser.id, interaction.guildId);
        if (!recipientDoc.inventory) recipientDoc.inventory = [];
        recipientDoc.inventory.push({ giftId: giftKey, senderId: interaction.user.id, receivedAt: new Date().toISOString() });

        // Add friendship relationship XP
        await addFriendXp(senderDoc, recipientDoc, gift.xpBoost);

        const embed = new EmbedBuilder()
          .setColor('#FF69B4')
          .setTitle(`🎁 Gift Received!`)
          .setDescription(
            `🎉 <@${interaction.user.id}> sent <@${targetUser.id}> a ${gift.emoji} **${gift.name}** (${formatMoney(gift.price)})!\n\n` +
            `💌 *"Here is a special gift for you!"*\n\n` +
            `✨ **Friendship & Relationship XP Increased by +${gift.xpBoost}!**`
          )
          .setFooter({ text: `Sender Remaining Balance: ${formatMoney(getBalance(senderDoc))}` });

        return await interaction.reply({ embeds: [embed] });
      }
    }
  } catch (error) {
    logger.error('Error executing /gift command:', error);
    await interaction.reply({ content: '❌ Failed to send gift.', ephemeral: true });
  }
};
