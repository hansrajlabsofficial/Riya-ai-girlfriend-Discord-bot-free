import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserData } from '../database/models/User.js';

const RECIPES = [
  { id: 'iron_sword', name: '⚔️ Iron Sword', req: '🥈 Iron Ore', count: 2, desc: 'Increases Strength attribute effectiveness!' },
  { id: 'gold_shield', name: '🛡️ Golden Shield', req: '🥇 Gold Ore', count: 2, desc: 'Boosts Defense and reduces PvP damage!' },
  { id: 'diamond_armor', name: '🥋 Diamond Armor', req: '💎 Diamond Gem', count: 2, desc: 'Ultimate defense gear with bonus HP!' },
  { id: 'health_potion', name: '🧪 Health Potion', req: '🥉 Copper Ore', count: 2, desc: 'Restores 50 HP on consumption!' }
];

export const data = new SlashCommandBuilder()
  .setName('craft')
  .setDescription('Craft epic weapons, armor, and potions using mined materials!')
  .addStringOption(option =>
    option.setName('item')
      .setDescription('The item you want to craft')
      .setRequired(false)
      .addChoices(
        { name: '⚔️ Iron Sword (Req: 2x Iron Ore)', value: 'iron_sword' },
        { name: '🛡️ Golden Shield (Req: 2x Gold Ore)', value: 'gold_shield' },
        { name: '🥋 Diamond Armor (Req: 2x Diamond Gem)', value: 'diamond_armor' },
        { name: '🧪 Health Potion (Req: 2x Copper Ore)', value: 'health_potion' }
      ));

export const execute = async (interaction) => {
  const user = interaction.user;
  const userDoc = await getUserData(user.id, interaction.guildId);
  const selectedItemId = interaction.options.getString('item');

  if (!userDoc.inventory) userDoc.inventory = [];

  if (!selectedItemId) {
    // Show craft recipe list
    const embed = new EmbedBuilder()
      .setTitle('🔨 Riya\'s Forge & Crafting Bench')
      .setColor('#FFA500')
      .setDescription('Use `/craft item:<choice>` to craft items from your mined materials!')
      .addFields(RECIPES.map(r => ({
        name: r.name,
        value: `**Recipe:** ${r.count}x ${r.req}\n*${r.desc}*`,
        inline: true
      })))
      .setFooter({ text: 'Riya AI Girlfriend • Mine materials with /mine!' });

    return interaction.reply({ embeds: [embed] });
  }

  const recipe = RECIPES.find(r => r.id === selectedItemId);
  if (!recipe) return interaction.reply({ content: '❌ Invalid crafting selection.', ephemeral: true });

  // Check ingredient count in inventory
  const matCount = userDoc.inventory.filter(item => item === recipe.req).length;
  if (matCount < recipe.count) {
    return interaction.reply({
      content: `❌ You do not have enough materials! Required: **${recipe.count}x ${recipe.req}** (You have: **${matCount}**). Mine more with \`/mine\`!`,
      ephemeral: true
    });
  }

  // Remove materials from inventory
  let removed = 0;
  userDoc.inventory = userDoc.inventory.filter(item => {
    if (item === recipe.req && removed < recipe.count) {
      removed++;
      return false;
    }
    return true;
  });

  // Add crafted item
  userDoc.inventory.push(recipe.name);
  await userDoc.save();

  const embed = new EmbedBuilder()
    .setTitle('✨ CRAFTING SUCCESSFUL!')
    .setColor('#00FF7F')
    .setDescription(`Clang! Riya assisted you at the anvil to forged **${recipe.name}**!\n\n*${recipe.desc}*`)
    .setFooter({ text: 'Riya AI Girlfriend • Equipped and saved to your inventory!' });

  return interaction.reply({ embeds: [embed] });
};
