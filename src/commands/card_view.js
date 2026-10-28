import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getCardByCode } from '../services/cardService.js';

export const data = new SlashCommandBuilder()
  .setName('card_view')
  .setDescription('View a high-resolution image and detailed stats of an anime card!')
  .addStringOption(option =>
    option.setName('code')
      .setDescription('4-character card code (e.g. v18v, vt8t, qndr)')
      .setRequired(true));

export const execute = async (interaction) => {
  const code = interaction.options.getString('code').toLowerCase().trim();

  const card = await getCardByCode(code);
  if (!card) {
    return interaction.reply({
      content: `❌ Card code \`${code}\` was not found in the global database!`,
      ephemeral: true
    });
  }

  const ownerText = card.ownerId ? `<@${card.ownerId}>` : 'Unclaimed / System';
  const headerInfo = `\`${card.code}\` • \`${card.stars}\` • \`#${card.print}\` • **${card.series}** · **${card.character}**`;

  const embed = new EmbedBuilder()
    .setTitle('Card Details')
    .setColor('#AA00FF')
    .setDescription(`Owned by ${ownerText}\n\n${headerInfo}`)
    .setImage(card.image)
    .setFooter({ text: 'Karuta-style Anime Card • Riya Collectibles Engine' });

  return interaction.reply({ embeds: [embed] });
};
