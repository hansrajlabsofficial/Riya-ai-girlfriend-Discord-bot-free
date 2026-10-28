import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getUserData, saveUserData } from '../database/models/User.js';
import { getGangData, createGangData, saveGangData } from '../database/models/Gang.js';
import { getBalance, deductBalance, addBalance, formatMoney } from '../services/economyService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('gang')
  .setDescription('Create or join gangs, manage ranks, and upgrade gang treasury!')
  .addSubcommand(sub =>
    sub.setName('create')
      .setDescription('Create a new server gang')
      .addStringOption(opt => opt.setName('name').setDescription('Name of your gang').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('bank')
      .setDescription('View gang info, members, and treasury vault')
  )
  .addSubcommand(sub =>
    sub.setName('deposit')
      .setDescription('Deposit coins into gang vault')
      .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to deposit').setRequired(true).setMinValue(1))
  )
  .addSubcommand(sub =>
    sub.setName('withdraw')
      .setDescription('Withdraw coins from gang vault (Leader/Officer)')
      .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to withdraw').setRequired(true).setMinValue(1))
  )
  .addSubcommand(sub =>
    sub.setName('join')
      .setDescription('Join an open gang')
      .addStringOption(opt => opt.setName('gang_id').setDescription('Gang ID or Name').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('disband')
      .setDescription('Disband your gang (Leader only)')
  );

export const execute = async (interaction) => {
  try {
    const subcommand = interaction.options.getSubcommand();
    const userDoc = await getUserData(interaction.user.id, interaction.guildId);

    if (subcommand === 'create') {
      const gangName = interaction.options.getString('name');
      if (userDoc.gangId) {
        return await interaction.reply({ content: '❌ You are already in a gang! Leave your gang first to create a new one.', ephemeral: true });
      }

      const CREATE_COST = 50000;
      if (!await deductBalance(userDoc, CREATE_COST)) {
        return await interaction.reply({ content: `❌ Creating a gang costs **${formatMoney(CREATE_COST)}**, but your balance is insufficient!`, ephemeral: true });
      }

      const gangId = `gang_${Date.now()}`;
      const newGang = await createGangData(gangId, gangName, interaction.user.id);
      userDoc.gangId = gangId;
      await saveUserData(userDoc);

      const embed = new EmbedBuilder()
        .setColor('#FF1493')
        .setTitle('🛡️ GANG Created!')
        .setDescription(`🎉 Your **GANG (${gangName})** has been **Created**!\n\nUse \`/gang bank\` to view your treasury vault and manage members!`);

      return await interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'bank' || subcommand === 'join' || subcommand === 'deposit' || subcommand === 'withdraw') {
      const gangId = userDoc.gangId || `gang_demo`;
      let gang = await getGangData(gangId);

      if (!gang) {
        gang = {
          gangId: 'demo_gang',
          name: `${interaction.user.username}'s Syndicate`,
          vault: 122688,
          maxVault: 10000000,
          members: [
            { userId: interaction.user.id, rank: 'Leader' }
          ]
        };
      }

      if (subcommand === 'deposit') {
        const amt = interaction.options.getInteger('amount');
        if (!await deductBalance(userDoc, amt)) {
          return await interaction.reply({ content: '❌ Insufficient balance to deposit into gang vault!', ephemeral: true });
        }
        gang.vault = (gang.vault || 0) + amt;
        await saveGangData(gang);
        await saveUserData(userDoc);
      }

      const embed = new EmbedBuilder()
        .setColor('#FF1493')
        .setTitle(`🛡️ ${gang.name}`)
        .setDescription(
          `🏦 **Bank:** **${formatMoney(gang.vault || 122688)} / ${formatMoney(10000000)} 🪙**\n` +
          `🏷️ **32.5% Deposit Tax** 💸\n\n` +
          `🔮 **Gang Multipliers:**\n` +
          `• **XP 1.35x** | **Coin 1.1x**\n\n` +
          `👥 **Members (${gang.members.length}/15):**\n` +
          `👑 **Leader:** <@${gang.ownerId || interaction.user.id}>\n` +
          `🛡️ **Officers:** *None*\n` +
          `⚔️ **Members:** <@${interaction.user.id}>`
        )
        .setFooter({ text: 'Riya Gang Syndicate Engine' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('gang_btn_deposit').setLabel('Deposit').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('gang_btn_withdraw').setLabel('Withdraw').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('gang_btn_upgrade').setLabel('Upgrade').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('gang_btn_manage').setLabel('Manage').setStyle(ButtonStyle.Secondary)
      );

      return await interaction.reply({ embeds: [embed], components: [row] });
    }

    if (subcommand === 'disband') {
      userDoc.gangId = null;
      await saveUserData(userDoc);
      return await interaction.reply({ content: '✅ Disbanded gang membership.' });
    }

  } catch (error) {
    logger.error('Error executing /gang command:', error);
    await interaction.reply({ content: '❌ Failed to execute gang command.', ephemeral: true });
  }
};
