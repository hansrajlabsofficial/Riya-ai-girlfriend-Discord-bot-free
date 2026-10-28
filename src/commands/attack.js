import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserData, saveUserData } from '../database/models/User.js';
import { addBalance, deductBalance, formatMoney } from '../services/economyService.js';
import { addXp } from '../services/rpgService.js';

export const data = new SlashCommandBuilder()
  .setName('attack')
  .setDescription('Attack another player in PvP combat!')
  .addUserOption(opt => opt.setName('user').setDescription('Target user to attack').setRequired(true));

export const execute = async (interaction) => {
  const targetUser = interaction.options.getUser('user');
  if (targetUser.id === interaction.user.id || targetUser.bot) {
    return await interaction.reply({ content: '❌ You cannot attack yourself or a bot!', ephemeral: true });
  }

  const attackerDoc = await getUserData(interaction.user.id, interaction.guildId);
  const defenderDoc = await getUserData(targetUser.id, interaction.guildId);

  const atkStr = attackerDoc.attributes?.strength || 1;
  const defArmor = defenderDoc.attributes?.defense || 1;

  const damage = Math.max(10, (atkStr * 15) - (defArmor * 5) + Math.floor(Math.random() * 20));
  defenderDoc.hp = Math.max(0, (defenderDoc.hp || 100) - damage);

  let lootMsg = '';
  if (defenderDoc.hp === 0) {
    const bounty = Math.floor((defenderDoc.balance || 10000) * 0.2);
    await deductBalance(defenderDoc, bounty);
    await addBalance(attackerDoc, bounty);
    defenderDoc.hp = 100; // Respawn HP
    lootMsg = `\n💀 **KNOCKOUT!** <@${targetUser.id}> was knocked out! <@${interaction.user.id}> looted **${formatMoney(bounty)}**! 💰`;
  }

  addXp(attackerDoc, 25);
  await saveUserData(attackerDoc);
  await saveUserData(defenderDoc);

  const embed = new EmbedBuilder()
    .setColor('#FF0000')
    .setTitle('⚔️ PvP Attack Executed!')
    .setDescription(
      `⚔️ <@${interaction.user.id}> dealt **${damage} Damage** to <@${targetUser.id}>!\n\n` +
      `❤️ Target Remaining HP: **${defenderDoc.hp} / ${defenderDoc.maxHp || 100}**${lootMsg}`
    );

  await interaction.reply({ embeds: [embed] });
};
