import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { getUserData } from '../database/models/User.js';
import { renderBankCard, formatMoney, generateUserSignature } from '../services/economyService.js';

export const data = new SlashCommandBuilder()
  .setName('bank')
  .setDescription('Inspect bank vault savings & custom bank card graphic!')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('Target user (leave empty to view your own)')
      .setRequired(false));

export const execute = async (interaction) => {
  await interaction.deferReply();
  const targetUser = interaction.options.getUser('user') || interaction.user;
  const userDoc = await getUserData(targetUser.id, interaction.guildId);

  const bankBuffer = await renderBankCard(targetUser, userDoc);
  const attachment = new AttachmentBuilder(bankBuffer, { name: 'bank-card.png' });
  const userSig = generateUserSignature(targetUser);

  const embed = new EmbedBuilder()
    .setTitle(`🏦 Official Bank Savings Account: ${targetUser.username}`)
    .setColor('#FF69B4')
    .setThumbnail('https://i.postimg.cc/63xkK4YM/HANSRAJ-AYAN-OFFICIAL-COMMUNITY-Global-Bank-discord-server.png')
    .setDescription(
      `💰 **Bank Savings:** **${formatMoney(userDoc.bank || 0)}**\n` +
      `👛 **Wallet Cash:** **${formatMoney(userDoc.balance || 0)}**\n` +
      `✒️ **Authorised Signature:** \`${userSig}\`\n\n` +
      `💡 *Money in the bank cannot be robbed by other players via \`/rob\`!*`
    )
    .setImage('attachment://bank-card.png')
    .setFooter({ text: `Riya AI Girlfriend • Signature: ${userSig}` });

  return interaction.editReply({ embeds: [embed], files: [attachment] });
};
