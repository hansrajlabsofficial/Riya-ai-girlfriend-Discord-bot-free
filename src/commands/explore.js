import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserData } from '../database/models/User.js';
import { addBalance, formatMoney } from '../services/economyService.js';
import { addXp } from '../services/rpgService.js';

const EXPLORE_LOCATIONS = [
  { name: '🌲 Mystic Enchanted Forest', coins: [300, 1200], xp: [50, 150], item: '🧪 Health Potion' },
  { name: '🏔️ Whispering Echo Mountain', coins: [500, 2000], xp: [80, 200], item: '💎 Crystal Shard' },
  { name: '🏛️ Ancient Ruined Temple', coins: [1000, 3500], xp: [120, 300], item: '📜 Relic Map' },
  { name: '🌊 Sunken Coral Cove', coins: [400, 1500], xp: [60, 180], item: '🦪 Shiny Pearl' }
];

export const data = new SlashCommandBuilder()
  .setName('explore')
  .setDescription('Embark on an adventure exploration to discover treasures, items & XP!');

export const execute = async (interaction) => {
  const user = interaction.user;
  const userDoc = await getUserData(user.id, interaction.guildId);

  const now = Date.now();
  const lastExplore = userDoc.cooldowns?.explore || 0;
  if (now - lastExplore < 300000) { // 5 minutes cooldown
    const remainingSec = Math.ceil((300000 - (now - lastExplore)) / 1000);
    const mins = Math.floor(remainingSec / 60);
    const secs = remainingSec % 60;
    return interaction.reply({
      content: `⏳ Your legs are tired! Rest for **${mins}m ${secs}s** before exploring again!`,
      ephemeral: true
    });
  }

  userDoc.cooldowns.explore = now;

  const loc = EXPLORE_LOCATIONS[Math.floor(Math.random() * EXPLORE_LOCATIONS.length)];
  const coinsFound = Math.floor(Math.random() * (loc.coins[1] - loc.coins[0] + 1)) + loc.coins[0];
  const xpGained = Math.floor(Math.random() * (loc.xp[1] - loc.xp[0] + 1)) + loc.xp[0];

  await addBalance(userDoc, coinsFound);
  const xpResult = addXp(userDoc, xpGained);

  if (!userDoc.inventory) userDoc.inventory = [];
  userDoc.inventory.push(loc.item);

  await userDoc.save();

  const embed = new EmbedBuilder()
    .setTitle(`🗺️ Exploration Result: ${loc.name}`)
    .setColor('#FF69B4')
    .setDescription(`You spent hours venturing through **${loc.name}** alongside Riya! Here is what you found:`)
    .addFields(
      { name: '🪙 Coins Discovered', value: formatMoney(coinsFound), inline: true },
      { name: '⭐ XP Gained', value: `+${xpGained} XP`, inline: true },
      { name: '🎒 Item Looted', value: loc.item, inline: true }
    )
    .setFooter({ text: xpResult.leveledUp ? `🎉 LEVEL UP! You are now Level ${xpResult.newLevel}!` : 'Riya AI Girlfriend • Keep exploring!' });

  return interaction.reply({ embeds: [embed] });
};
