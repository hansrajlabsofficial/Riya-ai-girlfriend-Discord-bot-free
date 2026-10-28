import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserCollection } from '../services/cardService.js';

export const data = new SlashCommandBuilder()
  .setName('card_collection')
  .setDescription('Inspect your or another user\'s anime card collection!')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('Target user (leave empty to view your own)')
      .setRequired(false));

export const execute = async (interaction) => {
  const target = interaction.options.getUser('user') || interaction.user;

  const cards = await getUserCollection(target.id);
  if (cards.length === 0) {
    return interaction.reply({
      content: `🎴 **${target.username}** has not collected any anime cards yet! Use \`/card_drop\` to drop & claim cards!`,
      ephemeral: true
    });
  }

  let listText = '';
  cards.forEach((c, idx) => {
    listText += `\`[${c.code}]\` **${c.character}** • ${c.stars} (#${c.print}) • *${c.series}*\n`;
  });

  const embed = new EmbedBuilder()
    .setTitle(`🎴 Anime Card Collection: ${target.username}`)
    .setThumbnail(target.displayAvatarURL({ dynamic: true }))
    .setColor('#FF00FF')
    .setDescription(`**Total Cards Collected:** ${cards.length}\n\n${listText}`)
    .setFooter({ text: 'Use /card_view <code> to view full card graphic!' });

  return interaction.reply({ embeds: [embed] });
};
