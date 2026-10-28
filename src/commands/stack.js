import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getUserData } from '../database/models/User.js';
import { getBalance, addBalance, deductBalance, formatMoney } from '../services/economyService.js';

const MULTIPLIERS = [1.0, 1.3, 1.8, 2.5, 3.5, 5.0];

export const data = new SlashCommandBuilder()
  .setName('stack')
  .setDescription('Stack blocks to build a skyscraper and multiply your wager!')
  .addIntegerOption(option =>
    option.setName('bet')
      .setDescription('Amount of coins to wager')
      .setRequired(true));

export const execute = async (interaction) => {
  const bet = interaction.options.getInteger('bet');
  const user = interaction.user;

  if (bet < 100) return interaction.reply({ content: '❌ Minimum bet for Stack is $100!', ephemeral: true });

  const userDoc = await getUserData(user.id, interaction.guildId);
  if (getBalance(userDoc) < bet) {
    return interaction.reply({ content: `❌ You do not have **${formatMoney(bet)}** in your wallet!`, ephemeral: true });
  }

  // Deduct initial bet
  await deductBalance(userDoc, bet);
  await userDoc.save();

  let level = 0;

  const renderComponents = () => new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('stack_next').setLabel(`🧱 STACK LEVEL ${level + 1} (${MULTIPLIERS[level + 1]}x)`).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('stack_cashout').setLabel(`💰 CASH OUT (${MULTIPLIERS[level]}x)`).setStyle(ButtonStyle.Success).setDisabled(level === 0)
  );

  const getEmbed = () => {
    let towerVisual = '';
    for (let l = level; l > 0; l--) {
      towerVisual += `🟩🟩🟩 [ Level ${l}: ${MULTIPLIERS[l]}x ]\n`;
    }
    if (level === 0) towerVisual = '⬜⬜⬜ [ Ground Level ]';

    return new EmbedBuilder()
      .setTitle('🏗️ Skyscraper Block Stacker')
      .setColor('#FFD700')
      .setDescription(`**Bet:** ${formatMoney(bet)}\n**Current Level:** ${level}/5\n**Current Multiplier:** ${MULTIPLIERS[level]}x\n**Current Value:** ${formatMoney(Math.floor(bet * MULTIPLIERS[level]))}\n\n${towerVisual}\n\nClick **Stack** to go higher (75% success chance per block), or **Cash Out**!`)
      .setFooter({ text: 'Riya AI Girlfriend • Tower Stacker' });
  };

  const message = await interaction.reply({ embeds: [getEmbed()], components: [renderComponents()], fetchReply: true });

  const collector = message.createMessageComponentCollector({ filter: i => i.user.id === user.id, time: 60000 });

  collector.on('collect', async i => {
    if (i.customId === 'stack_cashout') {
      collector.stop('cashout');
      const winAmount = Math.floor(bet * MULTIPLIERS[level]);
      const freshUser = await getUserData(user.id, interaction.guildId);
      await addBalance(freshUser, winAmount);
      await freshUser.save();

      const winEmbed = new EmbedBuilder()
        .setTitle('🎉 STACK CASHOUT VICTORY!')
        .setColor('#00FF7F')
        .setDescription(`Great construction! You cashed out at **Level ${level} (${MULTIPLIERS[level]}x)**!\n\n**Total Payout:** ${formatMoney(winAmount)}`)
        .setFooter({ text: 'Riya AI Girlfriend • Tower Completed!' });

      return i.update({ embeds: [winEmbed], components: [] });
    }

    if (i.customId === 'stack_next') {
      // 75% chance to stack successfully
      const success = Math.random() < 0.75;
      if (success) {
        level++;
        if (level === 5) { // MAX LEVEL!
          collector.stop('max_level');
          const winAmount = Math.floor(bet * MULTIPLIERS[5]);
          const freshUser = await getUserData(user.id, interaction.guildId);
          await addBalance(freshUser, winAmount);
          await freshUser.save();

          const maxEmbed = new EmbedBuilder()
            .setTitle('🏆 MAXIMUM HEIGHT REACHED! 5.0x JACKPOT!')
            .setColor('#FFD700')
            .setDescription(`INCREDIBLE! You stacked all 5 blocks without falling!\n\n**Total Payout (5.0x):** ${formatMoney(winAmount)}`)
            .setFooter({ text: 'Riya AI Girlfriend • Master Architect!' });

          return i.update({ embeds: [maxEmbed], components: [] });
        }

        return i.update({ embeds: [getEmbed()], components: [renderComponents()] });
      } else {
        // TOWER COLLAPSED! 50% loss rule applied
        collector.stop('collapsed');
        const refund = Math.floor(bet * 0.50);
        const freshUser = await getUserData(user.id, interaction.guildId);
        await addBalance(freshUser, refund);
        await freshUser.save();

        const failEmbed = new EmbedBuilder()
          .setTitle('💥 TOWER CRASHED!')
          .setColor('#FF0000')
          .setDescription(`Oof! The block wobbled and your skyscraper collapsed at Level ${level + 1}! 🧱\n\n**Result:** Loss! (50% penalty applied, ${formatMoney(refund)} returned).`)
          .setFooter({ text: 'Riya AI Girlfriend • 50% Loss Rule Applied' });

        return i.update({ embeds: [failEmbed], components: [] });
      }
    }
  });

  collector.on('end', (collected, reason) => {
    if (reason === 'time') {
      interaction.editReply({ content: '⏰ Stack session timed out.', embeds: [], components: [] }).catch(() => {});
    }
  });
};
