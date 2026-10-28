import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getUserData } from '../database/models/User.js';
import { getBalance, addBalance, deductBalance, formatMoney } from '../services/economyService.js';

export const data = new SlashCommandBuilder()
  .setName('mines')
  .setDescription('Play the 5x5 Minefield Gambling Grid! Uncover gems and cash out before hitting bombs!')
  .addIntegerOption(option =>
    option.setName('bet')
      .setDescription('Amount of coins to wager')
      .setRequired(true));

export const execute = async (interaction) => {
  const bet = interaction.options.getInteger('bet');
  const user = interaction.user;

  if (bet < 100) return interaction.reply({ content: '❌ Minimum bet for Mines is $100!', ephemeral: true });

  const userDoc = await getUserData(user.id, interaction.guildId);
  if (getBalance(userDoc) < bet) {
    return interaction.reply({ content: `❌ You do not have **${formatMoney(bet)}** in your wallet!`, ephemeral: true });
  }

  // Deduct initial bet upfront
  await deductBalance(userDoc, bet);
  await userDoc.save();

  // Create grid state (25 tiles: 20 gems, 5 bombs)
  const grid = Array(25).fill('💎');
  const bombIndices = new Set();
  while (bombIndices.size < 5) {
    bombIndices.add(Math.floor(Math.random() * 25));
  }
  for (const idx of bombIndices) {
    grid[idx] = '💣';
  }

  let gemsFound = 0;
  let isGameOver = false;

  const getMultiplier = (gems) => (1 + (gems * 0.25)).toFixed(2);

  const renderComponents = (disabled = false) => {
    const rows = [];
    for (let r = 0; r < 5; r++) {
      const row = new ActionRowBuilder();
      for (let c = 0; c < 5; c++) {
        const idx = r * 5 + c;
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`tile_${idx}`)
            .setLabel('❓')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled)
        );
      }
      rows.push(row);
    }

    // Cash out button row
    const cashOutRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('cashout')
        .setLabel(`💰 Cash Out (${getMultiplier(gemsFound)}x)`)
        .setStyle(ButtonStyle.Success)
        .setDisabled(disabled || gemsFound === 0)
    );
    rows.push(cashOutRow);
    return rows;
  };

  const currentWinnings = Math.floor(bet * getMultiplier(gemsFound));

  const embed = new EmbedBuilder()
    .setTitle('💣 Minefield Grid Casino')
    .setColor('#FF00FF')
    .setDescription(`**Bet:** ${formatMoney(bet)}\n**Gems Found:** ${gemsFound}/20\n**Multiplier:** ${getMultiplier(gemsFound)}x\n**Current Value:** ${formatMoney(currentWinnings)}\n\nClick any tile ❓ to uncover a Gem 💎! Hit a Bomb 💣 and lose 50% of your bet!`)
    .setFooter({ text: 'Riya AI Girlfriend • Mines Gambling Engine' });

  const message = await interaction.reply({ embeds: [embed], components: renderComponents(), fetchReply: true });

  const collector = message.createMessageComponentCollector({ filter: i => i.user.id === user.id, time: 120000 });

  collector.on('collect', async i => {
    if (isGameOver) return;

    if (i.customId === 'cashout') {
      isGameOver = true;
      collector.stop('cashout');

      const winAmount = Math.floor(bet * parseFloat(getMultiplier(gemsFound)));
      const freshUser = await getUserData(user.id, interaction.guildId);
      await addBalance(freshUser, winAmount);
      await freshUser.save();

      const winEmbed = new EmbedBuilder()
        .setTitle('🎉 MINES CASHOUT VICTORY!')
        .setColor('#00FF7F')
        .setDescription(`Smart move! You cashed out with **${gemsFound} Gems** at **${getMultiplier(gemsFound)}x**!\n\n**Total Payout:** ${formatMoney(winAmount)}`)
        .setFooter({ text: 'Riya AI Girlfriend • Minefield Winner!' });

      return i.update({ embeds: [winEmbed], components: [] });
    }

    const tileIdx = parseInt(i.customId.replace('tile_', ''));
    if (grid[tileIdx] === '💣') {
      // BOMB HIT! 50% Loss penalty (Return 50% of initial bet back, lose 50%)
      isGameOver = true;
      collector.stop('bomb');

      const refund = Math.floor(bet * 0.50);
      const freshUser = await getUserData(user.id, interaction.guildId);
      await addBalance(freshUser, refund);
      await freshUser.save();

      const bombEmbed = new EmbedBuilder()
        .setTitle('💥 BOOM! BOMB DETONATED!')
        .setColor('#FF0000')
        .setDescription(`Ouch! You stepped on a landmine 💣!\n\n**Result:** Loss! You lost **50% of your bet** (${formatMoney(refund)} returned to wallet).`)
        .setFooter({ text: 'Riya AI Girlfriend • 50% Loss Rule Applied' });

      return i.update({ embeds: [bombEmbed], components: [] });
    } else {
      // GEM REVEALED!
      gemsFound++;
      const nextWin = Math.floor(bet * parseFloat(getMultiplier(gemsFound)));

      const updatedEmbed = new EmbedBuilder()
        .setTitle('💎 GEM REVEALED!')
        .setColor('#00FF7F')
        .setDescription(`Nice! You found a Gem 💎!\n\n**Gems Found:** ${gemsFound}/20\n**Multiplier:** ${getMultiplier(gemsFound)}x\n**Current Value:** ${formatMoney(nextWin)}`)
        .setFooter({ text: 'Keep going or click Cash Out!' });

      return i.update({ embeds: [updatedEmbed], components: renderComponents() });
    }
  });

  collector.on('end', (collected, reason) => {
    if (!isGameOver && reason === 'time') {
      interaction.editReply({ content: '⏰ Minefield session timed out.', embeds: [], components: [] }).catch(() => {});
    }
  });
};
