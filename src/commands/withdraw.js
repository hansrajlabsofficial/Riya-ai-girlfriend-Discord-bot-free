import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserData, saveUserData } from '../database/models/User.js';
import { addBalance, formatMoney, getBalance } from '../services/economyService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('withdraw')
  .setDescription('Withdraw cash from bank (wallet cash can be robbed!)')
  .addStringOption(opt =>
    opt.setName('amount')
      .setDescription('Amount to withdraw or "all" / "max" / "100%"')
      .setRequired(true)
  );

function parseWithdrawAmount(amountStr, bankBal) {
  if (!amountStr) return 0;
  const str = amountStr.toString().toLowerCase().trim();
  if (['all', 'max', '100%', 'full'].includes(str)) {
    return bankBal;
  }
  if (/^\d+[kK]$/.test(str)) {
    return parseInt(str.slice(0, -1), 10) * 1000;
  }
  if (/^\d+[mM]$/.test(str)) {
    return parseInt(str.slice(0, -1), 10) * 1000000;
  }
  const val = parseInt(str, 10);
  return isNaN(val) ? 0 : val;
}

export const execute = async (interaction) => {
  try {
    const rawAmt = interaction.options.getString('amount');
    const userDoc = await getUserData(interaction.user.id, interaction.guildId);
    const bankBal = userDoc.bank || 0;

    const amt = parseWithdrawAmount(rawAmt, bankBal);

    if (amt <= 0) {
      return await interaction.reply({
        content: '❌ Please specify a valid withdrawal amount or type `"all"` / `"100%"`!',
        ephemeral: true
      });
    }

    if (amt > bankBal) {
      return await interaction.reply({
        content: `❌ Insufficient bank savings! You only have **${formatMoney(bankBal)}** in your bank vault!`,
        ephemeral: true
      });
    }

    userDoc.bank = bankBal - amt;
    await addBalance(userDoc, amt);
    await saveUserData(userDoc);

    const isAll = (amt === bankBal);

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('🏦 Bank Withdrawal Successful')
      .setDescription(
        `✅ ${isAll ? '🎉 **WITHDREW 100% BANK SAVINGS!**' : 'Successfully'} transferred **${formatMoney(amt)}** from your bank savings into wallet cash!\n\n` +
        `💳 **Wallet Cash:** **${formatMoney(getBalance(userDoc))}**\n` +
        `🏦 **Bank Savings:** **${formatMoney(userDoc.bank)}**\n\n` +
        `⚠️ **WALLET EXPOSURE WARNING**: Cash stored in your wallet **CAN BE ROBBED** by enemy players using \`/rob\`! Keep cash safe in the bank!`
      )
      .setFooter({ text: 'Riya Official Banking & Security System ☕✨' });

    return await interaction.reply({ embeds: [embed] });

  } catch (error) {
    logger.error('Error executing /withdraw command:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Failed to process bank withdrawal.', ephemeral: true }).catch(() => {});
    }
  }
};
