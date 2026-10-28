import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ComponentType
} from 'discord.js';
import { getUserData, saveUserData } from '../database/models/User.js';
import { getBalance, addBalance, deductBalance, formatMoney } from '../services/economyService.js';
import { addXp } from '../services/rpgService.js';
import { logger } from '../utils/logger.js';

export const MARKET_ITEMS = {
  teddy_bear: { id: 'teddy_bear', name: '🧸 Teddy Bear', price: 100, xp: 20, desc: 'Cozy, cute fluffy teddy bear!' },
  red_flower: { id: 'red_flower', name: '🌹 Red Flower', price: 400, xp: 50, desc: 'Sweet and romantic red rose.' },
  health_potion: { id: 'health_potion', name: '🧪 Health Potion', price: 300, xp: 10, desc: 'Restores HP in dungeons & combat.' },
  iron_sword: { id: 'iron_sword', name: '⚔️ Iron Sword', price: 2500, xp: 100, desc: 'Increases Strength attribute by +5.' },
  steel_shield: { id: 'steel_shield', name: '🛡️ Steel Shield', price: 2500, xp: 100, desc: 'Increases Defense attribute by +5.' },
  diamond_ring: { id: 'diamond_ring', name: '💍 Diamond Ring', price: 500000, xp: 1000, desc: 'Luxury symbol of eternal affection.' }
};

export const SELL_PRICES = {
  '🥉 Copper Ore': 300,
  '🥈 Iron Ore': 750,
  '🥇 Gold Ore': 2000,
  '💎 Diamond Gem': 5000,
  '🧪 Health Potion': 200,
  '💎 Crystal Shard': 600,
  '📜 Relic Map': 1200,
  '🦪 Shiny Pearl': 400,
  '🧸 Teddy Bear': 75,
  '🌹 Red Flower': 300,
  '⚔️ Iron Sword': 1800,
  '🛡️ Steel Shield': 1800,
  '💍 Diamond Ring': 400000
};

export const data = new SlashCommandBuilder()
  .setName('market')
  .setDescription('Browse the global marketplace to buy everything or sell everything!')
  .addSubcommand(sub =>
    sub.setName('browse')
      .setDescription('Open the interactive marketplace store')
  )
  .addSubcommand(sub =>
    sub.setName('buyall')
      .setDescription('Buy 1 of every available item in the store!')
  )
  .addSubcommand(sub =>
    sub.setName('sellall')
      .setDescription('Sell all raw ores, gems & loot from inventory for instant cash!')
  );

export const execute = async (interaction) => {
  try {
    const subcommand = interaction.options.getSubcommand(false) || 'browse';
    const authorUser = interaction.user;
    const userDoc = await getUserData(authorUser.id, interaction.guildId);

    // 1. Direct Subcommand Execution: /market buyall
    if (subcommand === 'buyall') {
      return await executeBuyAll(interaction, authorUser, userDoc);
    }

    // 2. Direct Subcommand Execution: /market sellall
    if (subcommand === 'sellall') {
      return await executeSellAll(interaction, authorUser, userDoc);
    }

    // 3. Interactive Browse Mode: /market browse
    return await renderMarketplaceUI(interaction, authorUser, userDoc);

  } catch (error) {
    logger.error('Error executing /market command:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Failed to open marketplace.', ephemeral: true }).catch(() => {});
    }
  }
};

async function executeBuyAll(interaction, authorUser, userDoc) {
  let userBal = getBalance(userDoc);
  const itemsPurchased = [];
  let totalCost = 0;

  if (!userDoc.inventory) userDoc.inventory = [];

  for (const key of Object.keys(MARKET_ITEMS)) {
    const item = MARKET_ITEMS[key];
    if (userBal >= item.price) {
      userBal -= item.price;
      totalCost += item.price;
      itemsPurchased.push(item);
      userDoc.inventory.push(item.name);
      if (item.xp) addXp(userDoc, item.xp);
    }
  }

  if (itemsPurchased.length === 0) {
    const minPrice = MARKET_ITEMS.teddy_bear.price;
    return await interaction.reply({
      content: `💸 **Insufficient Funds!** You need at least **${formatMoney(minPrice)}** in your wallet to buy items from the store!`,
      ephemeral: true
    });
  }

  await deductBalance(userDoc, totalCost);
  await saveUserData(userDoc);

  const purchasedList = itemsPurchased.map(i => `• ${i.name} (${formatMoney(i.price)})`).join('\n');

  const embed = new EmbedBuilder()
    .setTitle('🛍️ BUY EVERYTHING - MARKET TRANSACTION')
    .setColor('#00FF7F')
    .setDescription(
      `🎉 **Purchase Successful!** You bought **${itemsPurchased.length} items** from the market store!\n\n` +
      `**Items Purchased:**\n${purchasedList}\n\n` +
      `💵 **Total Cost:** **${formatMoney(totalCost)}**\n` +
      `👛 **Remaining Wallet Balance:** **${formatMoney(getBalance(userDoc))}**`
    )
    .setFooter({ text: 'Riya AI Girlfriend • Items added to your inventory! ☕✨' });

  if (interaction.replied || interaction.deferred) {
    return await interaction.editReply({ embeds: [embed], components: [] });
  } else {
    return await interaction.reply({ embeds: [embed] });
  }
}

async function executeSellAll(interaction, authorUser, userDoc) {
  if (!userDoc.inventory || userDoc.inventory.length === 0) {
    const msg = '🎒 Your inventory is completely empty! Mine, explore, or buy items first!';
    if (interaction.replied || interaction.deferred) {
      return await interaction.editReply({ content: msg, components: [] });
    } else {
      return await interaction.reply({ content: msg, ephemeral: true });
    }
  }

  let totalEarnings = 0;
  let itemsSold = 0;
  const remainingInventory = [];
  const soldSummary = {};

  for (const item of userDoc.inventory) {
    if (SELL_PRICES[item]) {
      const price = SELL_PRICES[item];
      totalEarnings += price;
      itemsSold++;
      soldSummary[item] = (soldSummary[item] || 0) + 1;
    } else {
      remainingInventory.push(item);
    }
  }

  if (itemsSold === 0) {
    const msg = '❌ You have no sellable items in your inventory!';
    if (interaction.replied || interaction.deferred) {
      return await interaction.editReply({ content: msg, components: [] });
    } else {
      return await interaction.reply({ content: msg, ephemeral: true });
    }
  }

  userDoc.inventory = remainingInventory;
  await addBalance(userDoc, totalEarnings);
  await saveUserData(userDoc);

  const soldList = Object.keys(soldSummary).map(key => `• **x${soldSummary[key]}** ${key} (+${formatMoney(SELL_PRICES[key] * soldSummary[key])})`).join('\n');

  const embed = new EmbedBuilder()
    .setTitle('💰 SELL EVERYTHING - TRANSACTION COMPLETE')
    .setColor('#FFD700')
    .setDescription(
      `Cha-ching! You bulk sold **${itemsSold} items** from your inventory!\n\n` +
      `**Summary of Items Sold:**\n${soldList}\n\n` +
      `💵 **Total Revenue Earned:** **${formatMoney(totalEarnings)}**\n` +
      `👛 **New Wallet Balance:** **${formatMoney(getBalance(userDoc))}**`
    )
    .setFooter({ text: 'Riya AI Girlfriend • Mine & explore to earn more money! ☕✨' });

  if (interaction.replied || interaction.deferred) {
    return await interaction.editReply({ embeds: [embed], components: [] });
  } else {
    return await interaction.reply({ embeds: [embed] });
  }
}

async function renderMarketplaceUI(interaction, authorUser, userDoc) {
  const buildEmbed = () => {
    const storeList = Object.values(MARKET_ITEMS)
      .map(item => `${item.name} — **${formatMoney(item.price)}**\n*${item.desc}*`)
      .join('\n\n');

    return new EmbedBuilder()
      .setTitle('🛍️ Riya Official Global Marketplace')
      .setColor('#FF1493')
      .setDescription(
        `Welcome to the global market store! Select an option below to buy or sell items:\n\n` +
        `💰 **Your Wallet Balance:** **${formatMoney(getBalance(userDoc))}**\n` +
        `📦 **Inventory Items:** **${userDoc.inventory?.length || 0} items**\n\n` +
        `--- **Market Store Catalogue** ---\n${storeList}`
      )
      .setFooter({ text: 'Click "Buy Everything" or "Sell Everything" for 1-click transactions!' });
  };

  const buildButtons = () => new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('m_buy_all').setLabel('🛍️ Buy Everything').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('m_sell_all').setLabel('💰 Sell Everything').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('m_inv').setLabel('📦 My Inventory').setStyle(ButtonStyle.Secondary)
  );

  const initialMsg = await interaction.reply({
    embeds: [buildEmbed()],
    components: [buildButtons()],
    fetchReply: true
  });

  const collector = initialMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120000
  });

  collector.on('collect', async i => {
    if (i.user.id !== authorUser.id) {
      return i.reply({ content: '❌ Use `/market` to open your own market menu!', ephemeral: true });
    }

    const currentDoc = await getUserData(authorUser.id, interaction.guildId);

    if (i.customId === 'm_buy_all') {
      await executeBuyAll(i, authorUser, currentDoc);
    } else if (i.customId === 'm_sell_all') {
      await executeSellAll(i, authorUser, currentDoc);
    } else if (i.customId === 'm_inv') {
      const invList = currentDoc.inventory?.length > 0
        ? currentDoc.inventory.join(', ')
        : '*Empty Inventory*';
      await i.reply({
        content: `📦 **Your Inventory (${currentDoc.inventory?.length || 0}):**\n${invList}`,
        ephemeral: true
      });
    }
  });
}
