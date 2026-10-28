import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { ANIME_DATABASE } from '../services/cardService.js';

export const data = new SlashCommandBuilder()
  .setName('card_lookup')
  .setDescription('Look up details and drop stats of an anime character!')
  .addStringOption(option =>
    option.setName('character')
      .setDescription('Anime character name to search')
      .setRequired(true));

export const execute = async (interaction) => {
  const query = interaction.options.getString('character').toLowerCase().trim();

  const found = ANIME_DATABASE.find(c => c.character.toLowerCase().includes(query) || c.series.toLowerCase().includes(query));

  if (!found) {
    return interaction.reply({ content: `🔍 No character found matching \`${query}\`. Try searching Nezuko, Zero Two, Mikasa, Gojo, etc.!`, ephemeral: true });
  }

  const embed = new EmbedBuilder()
    .setTitle(`🔍 Character Lookup: ${found.character}`)
    .setColor('#00FFFF')
    .addFields(
      { name: '👤 Character Name', value: found.character, inline: true },
      { name: '📺 Anime Series', value: found.series, inline: true },
      { name: '✨ Rarity / Wishlist Rank', value: '⭐ Top Tier Waifu/Husbando', inline: true }
    )
    .setImage(found.image)
    .setFooter({ text: 'Riya AI Girlfriend • Karuta-style Character Database' });

  return interaction.reply({ embeds: [embed] });
};
