import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserData } from '../database/models/User.js';
import { addBalance, formatMoney } from '../services/economyService.js';

const ITEM_PRICES = {
  '🥉 Copper Ore': 200,
  '🥈 Iron Ore': 500,
  '🥇 Gold Ore': 1500,
  '💎 Diamond Gem': 5000,
  '🧪 Health Potion': 150,
  '💎 Crystal Shard': 600,
  '📜 Relic Map': 1200,
  '🦪 Shiny Pearl': 400
};

export const data = new SlashCommandBuilder()
  .setName('bulksell')
  .setDescription('Bulk sell all raw ores, gems & exploration loot from your inventory for instant cash!');

export const execute = async (interaction) => {
  const user = interaction.user;
  const userDoc = await getUserData(user.id, interaction.guildId);

  if (!userDoc.inventory || userDoc.inventory.length === 0) {
    return interaction.reply({ content: '🎒 Your inventory is completely empty! Mine or explore first.', ephemeral: true });
  }

  let totalEarnings = 0;
  let itemsSold = 0;
  const remainingInventory = [];

  for (const item of userDoc.inventory) {
    if (ITEM_PRICES[item]) {
      totalEarnings += ITEM_PRICES[item];
      itemsSold++;
    } else {
      remainingInventory.push(item); // Keep non-sellable gear like weapons/gifts
    }
  }

  if (itemsSold === 0) {
    return interaction.reply({ content: '❌ You have no sellable raw materials or loot items in your inventory!', ephemeral: true });
  }

  userDoc.inventory = remainingInventory;
  await addBalance(userDoc, totalEarnings);
  await userDoc.save();

  const embed = new EmbedBuilder()
    .setTitle('💰 Bulk Sell Transaction Complete')
    .setColor('#00FF7F')
    .setDescription(`Cha-ching! You sold **${itemsSold} items** from your inventory!`)
    .addFields(
      { name: '💵 Total Revenue', value: formatMoney(totalEarnings), inline: true },
      { name: '👛 New Balance', value: formatMoney(userDoc.balance), inline: true }
    )
    .setFooter({ text: 'Riya AI Girlfriend • Mine & explore to earn more money!' });

  return interaction.reply({ embeds: [embed] });
};
