import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserData } from '../database/models/User.js';
import { addBalance, formatMoney } from '../services/economyService.js';
import { addXp } from '../services/rpgService.js';

const DUNGEON_BOSSES = [
  { name: '🐲 Shadow Flame Dragon', hp: 300, atk: 35, coins: 5000, xp: 500, drop: '🗡️ Dragon Slayer Sword' },
  { name: '🗿 Obsidian Golem', hp: 200, atk: 25, coins: 3000, xp: 350, drop: '🛡️ Obsidian Shield' },
  { name: '🦇 Nether Demon Lord', hp: 150, atk: 20, coins: 2000, xp: 250, drop: '👑 Demon Crown' }
];

export const data = new SlashCommandBuilder()
  .setName('dungeon')
  .setDescription('Enter the perilous underworld dungeon to raid dangerous bosses!');

export const execute = async (interaction) => {
  const user = interaction.user;
  const userDoc = await getUserData(user.id, interaction.guildId);

  if (userDoc.hp <= 0) {
    return interaction.reply({
      content: '❌ You are unconscious with **0 HP**! Use `/health` or consume a Health Potion to restore HP before entering the dungeon!',
      ephemeral: true
    });
  }

  const now = Date.now();
  const lastDungeon = userDoc.cooldowns?.dungeon || 0;
  if (now - lastDungeon < 600000) { // 10 minutes
    const remainingSec = Math.ceil((600000 - (now - lastDungeon)) / 1000);
    const mins = Math.floor(remainingSec / 60);
    const secs = remainingSec % 60;
    return interaction.reply({
      content: `⏳ Dungeon portal is recovering magic! Try again in **${mins}m ${secs}s**!`,
      ephemeral: true
    });
  }

  userDoc.cooldowns.dungeon = now;

  const boss = DUNGEON_BOSSES[Math.floor(Math.random() * DUNGEON_BOSSES.length)];

  // Combat calculation: Player ATK = 10 + Strength * 5; Player DEF = Defense * 3
  const str = userDoc.attributes?.strength || 1;
  const def = userDoc.attributes?.defense || 1;
  const playerAtk = 10 + (str * 5);
  const playerDef = def * 3;

  // Boss fight rounds simulation
  let bossHp = boss.hp;
  let playerHp = userDoc.hp;

  while (bossHp > 0 && playerHp > 0) {
    // Player hits boss
    bossHp -= playerAtk;
    if (bossHp <= 0) break;

    // Boss hits player
    const damage = Math.max(5, boss.atk - playerDef);
    playerHp -= damage;
  }

  userDoc.hp = Math.max(0, playerHp);

  if (bossHp <= 0) {
    // VICTORY!
    await addBalance(userDoc, boss.coins);
    const xpResult = addXp(userDoc, boss.xp);

    if (!userDoc.inventory) userDoc.inventory = [];
    userDoc.inventory.push(boss.drop);
    await userDoc.save();

    const embed = new EmbedBuilder()
      .setTitle(`⚔️ DUNGEON VICTORY! Defeated ${boss.name}`)
      .setColor('#FFD700')
      .setDescription(`Glorious combat! You and Riya vanquished **${boss.name}** in a brutal dungeon duel! 🔥`)
      .addFields(
        { name: '❤️ Remaining HP', value: `${userDoc.hp}/${userDoc.maxHp} HP`, inline: true },
        { name: '🪙 Gold Reward', value: formatMoney(boss.coins), inline: true },
        { name: '⭐ XP Gained', value: `+${boss.xp} XP`, inline: true },
        { name: '🎁 Legendary Loot', value: boss.drop, inline: false }
      )
      .setFooter({ text: xpResult.leveledUp ? `🎉 LEVEL UP! You reached Level ${xpResult.newLevel}!` : 'Riya AI Girlfriend • Dungeon Raid Complete' });

    return interaction.reply({ embeds: [embed] });
  } else {
    // DEFEAT! 50% HP Penalty
    const hpPenalty = Math.floor(userDoc.maxHp * 0.50);
    userDoc.hp = Math.max(0, userDoc.hp - hpPenalty);
    await userDoc.save();

    const embed = new EmbedBuilder()
      .setTitle(`💀 DUNGEON DEFEAT! Defeated by ${boss.name}`)
      .setColor('#FF0000')
      .setDescription(`Ouch! **${boss.name}** overpowered you in combat!\n\nYou took heavy damage and suffered a **50% HP penalty**. Current Health: **${userDoc.hp}/${userDoc.maxHp} HP**.`)
      .setFooter({ text: 'Riya AI Girlfriend • Upgrade your attributes with /attributes before fighting again!' });

    return interaction.reply({ embeds: [embed] });
  }
};
