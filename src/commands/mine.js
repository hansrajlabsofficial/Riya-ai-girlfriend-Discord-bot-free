import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} from 'discord.js';
import { getUserData, saveUserData } from '../database/models/User.js';
import { addBalance, formatMoney } from '../services/economyService.js';
import { addXp } from '../services/rpgService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('mine')
  .setDescription('Start a push-your-luck 4x5 mining game! Mine rocks or leave early!');

const COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes cooldown

export const execute = async (interaction) => {
  const authorUser = interaction.user;
  const userDoc = await getUserData(authorUser.id, interaction.guildId);

  // 1. Cooldown check (2 minutes)
  const now = Date.now();
  const lastMine = userDoc.cooldowns?.mine || 0;
  if (now - lastMine < COOLDOWN_MS) {
    const nextUnix = Math.floor((lastMine + COOLDOWN_MS) / 1000);
    return interaction.reply({
      content: `⛏️ **Pickaxe Overheating!** Wait until <t:${nextUnix}:R> (<t:${nextUnix}:t>) before mining again!`,
      ephemeral: true
    });
  }

  // 2. Game State setup (4 rows x 5 cols = 20 rock buttons)
  const totalTiles = 20; // 4 rows of 5
  const numBombs = 4; // 20% collapse risk (4 / 20 = 20%)

  const grid = Array(totalTiles).fill(null);
  const bombIndices = new Set();
  while (bombIndices.size < numBombs) {
    bombIndices.add(Math.floor(Math.random() * totalTiles));
  }

  for (let i = 0; i < totalTiles; i++) {
    if (bombIndices.has(i)) {
      grid[i] = { isBomb: true, emoji: '💥' };
    } else {
      // Safe rock loot between 1 and 10 ice/gems + cash multiplier ($250 per loot point)
      const lootAmount = Math.floor(Math.random() * 10) + 1;
      grid[i] = { isBomb: false, emoji: '🧊', loot: lootAmount, cash: lootAmount * 250, xp: lootAmount * 15 };
    }
  }

  const revealed = Array(totalTiles).fill(false);
  let totalLoot = 0;
  let totalCash = 0;
  let totalXp = 0;
  let crashed = false;
  let escaped = false;

  // 3. Helper to create embed
  const createEmbed = () => {
    const embed = new EmbedBuilder()
      .setTitle('MINING!')
      .setThumbnail('https://cdn-icons-png.flaticon.com/512/3082/3082060.png');

    if (crashed) {
      embed.setColor('#FF0000');
      embed.setDescription(
        `**💥 THE MINE COLLAPSED!**\n` +
        `You lost all your loot.`
      );
    } else if (escaped) {
      embed.setColor('#00FF7F');
      embed.setDescription(
        `**🟢 You left safely!**\n` +
        `You walked away with **${totalLoot}** 🧊 (**${formatMoney(totalCash)}**)!`
      );
    } else {
      embed.setColor('#5865F2'); // Blurple
      embed.setDescription(
        `**Click on the Rocks to Start Mining**\n` +
        `**Leave Early or Risk losing it ALL**\n\n` +
        `🧊 Your **LOOT!**: **${totalLoot}** 🧊 (${formatMoney(totalCash)})\n\n` +
        `💥 Collapse Risk: **20% Per Rock.**`
      );
    }

    embed.setFooter({ text: 'Riya Underground Mining Engine ☕✨' });
    return embed;
  };

  // 4. Helper to build components (5 action rows max)
  const buildComponents = (disabledAll = false) => {
    const rows = [];

    // Rows 0 to 3: 4 rows of 5 rock buttons (20 tiles)
    for (let r = 0; r < 4; r++) {
      const row = new ActionRowBuilder();
      for (let c = 0; c < 5; c++) {
        const index = r * 5 + c;
        const btn = new ButtonBuilder().setCustomId(`mine_rock_${index}`);

        if (revealed[index]) {
          const tile = grid[index];
          btn.setEmoji(tile.emoji);
          btn.setDisabled(true);
          if (tile.isBomb) {
            btn.setStyle(ButtonStyle.Danger);
          } else {
            btn.setStyle(ButtonStyle.Success);
          }
        } else {
          btn.setEmoji('🪨');
          btn.setStyle(ButtonStyle.Secondary);
          if (disabledAll) btn.setDisabled(true);
        }

        row.addComponents(btn);
      }
      rows.push(row);
    }

    // Row 4: Bottom Action Bar (◀️, Leave Mine, ▶️)
    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('mine_nav_left').setEmoji('◀️').setStyle(ButtonStyle.Primary).setDisabled(disabledAll),
      new ButtonBuilder().setCustomId('mine_leave').setLabel('Leave Mine').setStyle(ButtonStyle.Danger).setDisabled(disabledAll || (totalLoot === 0 && !crashed)),
      new ButtonBuilder().setCustomId('mine_nav_right').setEmoji('▶️').setStyle(ButtonStyle.Primary).setDisabled(disabledAll)
    );

    rows.push(actionRow);
    return rows;
  };

  const initialMsg = await interaction.reply({
    embeds: [createEmbed()],
    components: buildComponents(),
    fetchReply: true
  });

  const collector = initialMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120000 // 2 minutes timeout
  });

  collector.on('collect', async i => {
    if (i.user.id !== authorUser.id) {
      return i.reply({ content: "This isn't your mine!", ephemeral: true });
    }

    // Navigation buttons (◀️ / ▶️)
    if (i.customId === 'mine_nav_left' || i.customId === 'mine_nav_right') {
      return i.reply({
        content: 'You move deeper into the mine... (Next page logic can go here)',
        ephemeral: true
      });
    }

    // Leave Mine callback
    if (i.customId === 'mine_leave') {
      escaped = true;
      collector.stop('escaped');

      // Cash out rewards to database
      userDoc.cooldowns.mine = Date.now();
      await addBalance(userDoc, totalCash);
      addXp(userDoc, totalXp);
      await saveUserData(userDoc);

      return i.update({
        embeds: [createEmbed()],
        components: buildComponents(true)
      });
    }

    // Rock button click
    if (i.customId.startsWith('mine_rock_')) {
      const tileIndex = parseInt(i.customId.replace('mine_rock_', ''), 10);
      if (revealed[tileIndex]) return i.deferUpdate();

      revealed[tileIndex] = true;
      const tile = grid[tileIndex];

      if (tile.isBomb) {
        // Mine collapse!
        crashed = true;
        totalLoot = 0;
        totalCash = 0;
        totalXp = 0;

        collector.stop('collapsed');

        // Reveal all tiles
        for (let idx = 0; idx < totalTiles; idx++) {
          revealed[idx] = true;
        }

        userDoc.cooldowns.mine = Date.now();
        await saveUserData(userDoc);

        return i.update({
          embeds: [createEmbed()],
          components: buildComponents(true)
        });
      } else {
        // Safe rock!
        totalLoot += tile.loot;
        totalCash += tile.cash;
        totalXp += tile.xp;

        return i.update({
          embeds: [createEmbed()],
          components: buildComponents()
        });
      }
    }
  });

  collector.on('end', async (collected, reason) => {
    if (reason !== 'escaped' && reason !== 'collapsed') {
      // Timed out: Auto cash out if loot collected
      if (totalLoot > 0) {
        userDoc.cooldowns.mine = Date.now();
        await addBalance(userDoc, totalCash);
        addXp(userDoc, totalXp);
        await saveUserData(userDoc);
      }
      interaction.editReply({ components: buildComponents(true) }).catch(() => {});
    }
  });
};
