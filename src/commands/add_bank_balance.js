import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getUserData } from '../database/models/User.js';
import { addBalance, getBalance, formatMoney } from '../services/economyService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('add_bank_balance')
  .setDescription('Add money to a user\'s bank balance (Admin/Owner Only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addIntegerOption(opt =>
    opt.setName('amount')
      .setDescription('Amount of money to add ($)')
      .setRequired(true)
      .setMinValue(1)
  )
  .addUserOption(opt =>
    opt.setName('user')
      .setDescription('The user to credit money to')
      .setRequired(true)
  );

export const execute = async (interaction) => {
  try {
    // Admin / Owner Check
    const isGuildOwner = interaction.guild && interaction.user.id === interaction.guild.ownerId;
    const isAdmin = interaction.member && interaction.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isGuildOwner && !isAdmin) {
      return await interaction.reply({
        content: '❌ **Access Denied!** Only the Bot Owner or Server Administrators can use `/add_bank_balance`!',
        ephemeral: true
      });
    }

    const amount = interaction.options.getInteger('amount');
    const targetUser = interaction.options.getUser('user');

    const userDoc = await getUserData(targetUser.id, interaction.guildId);
    const newBalance = await addBalance(userDoc, amount);

    const embed = new EmbedBuilder()
      .setColor('#00FF7F')
      .setTitle('🏦 Admin Bank Deposit Successful')
      .setDescription(
        `✅ Successfully credited **${formatMoney(amount)}** to <@${targetUser.id}>!\n\n` +
        `💰 **New Total Bank Balance:** **${formatMoney(newBalance)}**`
      )
      .setFooter({ text: 'Riya Bank Reserve Control' });

    await interaction.reply({ embeds: [embed] });

  } catch (error) {
    logger.error('Error executing /add_bank_balance command:', error);
    await interaction.reply({ content: '❌ Failed to add money.', ephemeral: true });
  }
};
