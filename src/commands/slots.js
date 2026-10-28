import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserData, saveUserData } from '../database/models/User.js';
import { addBalance, deductBalance, getBalance, formatMoney } from '../services/economyService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('slots')
  .setDescription('Spin the Slots for a jackpot!')
  .addIntegerOption(opt => 
    opt.setName('bet')
      .setDescription('Bet amount in coins (default: $100)')
      .setRequired(false)
      .setMinValue(100)
  );

export const execute = async (interaction) => {
  try {
    await interaction.deferReply().catch(() => {});

    const rawBet = interaction.options.getInteger('bet');
    const bet = rawBet || 100;

    const userDoc = await getUserData(interaction.user.id, interaction.guildId);
    const currentBalance = getBalance(userDoc);

    if (currentBalance < bet) {
      return await interaction.editReply({
        content: `❌ **Insufficient Funds!** You need **${formatMoney(bet)}**, but your balance is **${formatMoney(currentBalance)}**.`
      });
    }

    if (!await deductBalance(userDoc, bet)) {
      return await interaction.editReply({
        content: `❌ **Transaction Failed:** Could not deduct **${formatMoney(bet)}** from wallet.`
      });
    }

    const items = ['🍒', '🍋', '💎', '7️⃣', '🔔'];
    const r1 = items[Math.floor(Math.random() * items.length)];
    const r2 = items[Math.floor(Math.random() * items.length)];
    const r3 = items[Math.floor(Math.random() * items.length)];

    let win = 0;
    if (r1 === r2 && r2 === r3) {
      win = bet * 5;
      await addBalance(userDoc, win);
    } else if (r1 === r2 || r2 === r3 || r1 === r3) {
      win = Math.floor(bet * 1.5);
      await addBalance(userDoc, win);
    }

    await saveUserData(userDoc);
    const finalBalance = getBalance(userDoc);

    const embed = new EmbedBuilder()
      .setColor(win > 0 ? '#00FF7F' : '#FF4500')
      .setTitle('🎰 Riya Casino Slot Machine')
      .setDescription(
        `### [ ${r1} | ${r2} | ${r3} ]\n\n` +
        (win > 0 
          ? `🎉 **JACKPOT!** You won **${formatMoney(win)}**!\n💳 **Wallet Balance:** **${formatMoney(finalBalance)}**` 
          : `❌ **No match!** Lost **${formatMoney(bet)}**.\n💳 **Remaining Balance:** **${formatMoney(finalBalance)}**`)
      )
      .setFooter({ text: 'AHP Group Pvt. Ltd. • Riya Casino Suite 💖' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error in /slots command:', error);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: '❌ An error occurred while spinning slots. Please try again!' }).catch(() => {});
    } else {
      await interaction.reply({ content: '❌ An error occurred while spinning slots. Please try again!', ephemeral: true }).catch(() => {});
    }
  }
};
