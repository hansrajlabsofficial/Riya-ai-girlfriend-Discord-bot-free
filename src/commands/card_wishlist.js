import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserWishlist, addToWishlist, removeFromWishlist } from '../services/cardService.js';

export const data = new SlashCommandBuilder()
  .setName('card_wishlist')
  .setDescription('Manage your waifu/husbando anime card wishlist!')
  .addStringOption(option =>
    option.setName('action')
      .setDescription('Action to perform (add, remove, view)')
      .setRequired(false)
      .addChoices(
        { name: '📜 View Wishlist', value: 'view' },
        { name: '➕ Add Character', value: 'add' },
        { name: '➖ Remove Character', value: 'remove' }
      ))
  .addStringOption(option =>
    option.setName('character')
      .setDescription('Character name for add/remove')
      .setRequired(false));

export const execute = async (interaction) => {
  const action = interaction.options.getString('action') || 'view';
  const character = interaction.options.getString('character');
  const user = interaction.user;

  if (action === 'add') {
    if (!character) return interaction.reply({ content: '❌ Please specify character name to add!', ephemeral: true });
    const list = addToWishlist(user.id, character);
    return interaction.reply({ content: `✅ Added **${character}** to your Karuta wishlist! Current wishlist items: **${list.length}**`, ephemeral: true });
  }

  if (action === 'remove') {
    if (!character) return interaction.reply({ content: '❌ Please specify character name to remove!', ephemeral: true });
    const list = removeFromWishlist(user.id, character);
    return interaction.reply({ content: `🗑️ Removed **${character}** from your wishlist! Remaining items: **${list.length}**`, ephemeral: true });
  }

  // View wishlist
  const list = getUserWishlist(user.id);
  const embed = new EmbedBuilder()
    .setTitle(`💖 Anime Card Wishlist: ${user.username}`)
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .setColor('#FF69B4')
    .setDescription(list.length > 0 ? list.map((c, i) => `${i + 1}. **${c}**`).join('\n') : 'Your wishlist is currently empty! Use `/card_wishlist action:add character:Name` to track your waifus/husbandos!')
    .setFooter({ text: 'Riya AI Girlfriend • Wishlist Engine' });

  return interaction.reply({ embeds: [embed] });
};
