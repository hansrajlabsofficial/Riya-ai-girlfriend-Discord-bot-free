import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserData, saveUserData } from '../database/models/User.js';
import { getBalance, addBalance, deductBalance, formatMoney } from '../services/economyService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('rob')
  .setDescription('Rob wallet cash from target player (50% fine on failure!)')
  .addUserOption(opt =>
    opt.setName('user')
      .setDescription('The target player to rob')
      .setRequired(true)
  );

const COOLDOWN_MS = 5 * 60 * 60 * 1000; // 5 hours cooldown (18,000,000 ms)

export const execute = async (interaction) => {
  try {
    const targetUser = interaction.options.getUser('user');
    const authorUser = interaction.user;

    if (targetUser.id === authorUser.id) {
      return await interaction.reply({ content: '❌ Baka! You cannot rob yourself! 🤦‍♀️', ephemeral: true });
    }

    if (targetUser.bot) {
      return await interaction.reply({ content: '❌ You cannot rob bots! They have cyber security shields! 🤖🛡️', ephemeral: true });
    }

    const robberDoc = await getUserData(authorUser.id, interaction.guildId);
    const targetDoc = await getUserData(targetUser.id, interaction.guildId);

    // Cooldown check (5 Hours)
    const now = Date.now();
    const lastRob = robberDoc.lastRobTimestamp || 0;
    if (now - lastRob < COOLDOWN_MS) {
      const nextAvailableUnix = Math.floor((lastRob + COOLDOWN_MS) / 1000);
      return await interaction.reply({
        content: `⏳ **Cooldown Active!** Hide from the police! Next rob is available <t:${nextAvailableUnix}:R> (<t:${nextAvailableUnix}:t>)! 🚓`,
        ephemeral: true
      });
    }

    const targetBal = getBalance(targetDoc);
    if (targetBal < 100) {
      return await interaction.reply({
        content: `🙈 <@${targetUser.id}> only has **${formatMoney(targetBal)}** in their wallet! Nothing worth stealing, Baka!`,
        ephemeral: true
      });
    }

    const robberBal = getBalance(robberDoc);
    if (robberBal < 200) {
      return await interaction.reply({
        content: `💸 You need at least **$200** in your wallet to risk a robbery fine on failure!`,
        ephemeral: true
      });
    }

    robberDoc.lastRobTimestamp = now;

    // Calculate success chance (50% base + Luck bonus)
    const luckAttr = (robberDoc.attributes && robberDoc.attributes.luck) || 1;
    const luckBonus = Math.min(20, (luckAttr - 1) * 2); // Max +20% luck bonus
    const successRate = 50 + luckBonus; // 50% to 70%

    const roll = Math.floor(Math.random() * 100) + 1;
    const isSuccess = roll <= successRate;

    if (isSuccess) {
      // Steal between 15% and 45% of target's wallet cash
      const percentStolen = (Math.floor(Math.random() * 31) + 15) / 100;
      const stolenAmount = Math.floor(targetBal * percentStolen);

      await deductBalance(targetDoc, stolenAmount);
      await addBalance(robberDoc, stolenAmount);

      await saveUserData(targetDoc);
      await saveUserData(robberDoc);

      const embed = new EmbedBuilder()
        .setColor('#00FF7F')
        .setTitle('🕵️‍♀️ Robbery Successful!')
        .setDescription(
          `🥷 <@${authorUser.id}> sneaked behind <@${targetUser.id}> and snatched **${formatMoney(stolenAmount)}**! 💸💰\n\n` +
          `💰 **Your New Wallet Balance:** **${formatMoney(getBalance(robberDoc))}**`
        )
        .setFooter({ text: 'Riya Underground Heist System ☕✨' });

      return await interaction.reply({ embeds: [embed] });

    } else {
      // 50% Loss Rule: Fined 50% of robber's current wallet cash!
      const fineAmount = Math.floor(robberBal * 0.50);

      await deductBalance(robberDoc, fineAmount);
      // Give 50% of fine to victim as compensation
      const compensation = Math.floor(fineAmount * 0.50);
      await addBalance(targetDoc, compensation);

      await saveUserData(targetDoc);
      await saveUserData(robberDoc);

      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🚨 CAUGHT RED-HANDED!')
        .setDescription(
          `🚓 Riya caught <@${authorUser.id}> trying to rob <@${targetUser.id}>!\n\n` +
          `💥 **50% FINE PENALTY APPLIED!** You lost **${formatMoney(fineAmount)}** (50% of your wallet cash)!\n` +
          `🤝 <@${targetUser.id}> received **${formatMoney(compensation)}** in victim compensation!`
        )
        .setFooter({ text: 'Crime does not pay in Amdavad! 👮‍♀️✨' });

      return await interaction.reply({ embeds: [embed] });
    }

  } catch (error) {
    logger.error('Error executing /rob command:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Failed to execute rob command.', ephemeral: true }).catch(() => {});
    }
  }
};
