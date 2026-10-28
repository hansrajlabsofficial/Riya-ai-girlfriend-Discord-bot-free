import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserData, saveUserData } from '../database/models/User.js';
import { getBalance, deductBalance, formatMoney } from '../services/economyService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('deposit')
  .setDescription('Deposit cash into bank vault (100% safe from /rob!)')
  .addStringOption(opt =>
    opt.setName('amount')
      .setDescription('Amount to deposit or "all" / "max" / "100%"')
      .setRequired(true)
  );

function parseDepositAmount(amountStr, walletBal) {
  if (!amountStr) return 0;
  const str = amountStr.toString().toLowerCase().trim();
  if (['all', 'max', '100%', 'full'].includes(str)) {
    return walletBal;
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
    const walletBal = getBalance(userDoc);

    const amt = parseDepositAmount(rawAmt, walletBal);

    if (amt <= 0) {
      return await interaction.reply({
        content: '❌ Please specify a valid deposit amount or type `"all"` / `"100%"`!',
        ephemeral: true
      });
    }

    if (amt > walletBal) {
      return await interaction.reply({
        content: `❌ Insufficient wallet cash! You only have **${formatMoney(walletBal)}** in your wallet!`,
        ephemeral: true
      });
    }

    if (!await deductBalance(userDoc, amt)) {
      return await interaction.reply({
        content: `❌ Insufficient wallet balance to deposit **${formatMoney(amt)}**!`,
        ephemeral: true
      });
    }

    userDoc.bank = (userDoc.bank || 0) + amt;
    await saveUserData(userDoc);

    const isAll = (amt === walletBal);

    const embed = new EmbedBuilder()
      .setColor('#00FF7F')
      .setTitle('🏦 Bank Vault Deposit Successful')
      .setDescription(
        `✅ ${isAll ? '🎉 **DEPOSITED 100% WALLET CASH!**' : 'Successfully'} transferred **${formatMoney(amt)}** into your safe bank vault!\n\n` +
        `💳 **Wallet Cash:** **${formatMoney(getBalance(userDoc))}**\n` +
        `🏦 **Bank Savings:** **${formatMoney(userDoc.bank)}**\n\n` +
        `🛡️ **100% SAFE PROTECTION**: Money stored in the bank vault is **100% protected** and **CANNOT be stolen** by enemy players using \`/rob\`!`
      )
      .setFooter({ text: 'Riya Official Banking & Security System ☕✨' });

    return await interaction.reply({ embeds: [embed] });

  } catch (error) {
    logger.error('Error executing /deposit command:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Failed to process bank deposit.', ephemeral: true }).catch(() => {});
    }
  }
};
