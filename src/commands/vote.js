import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserData } from '../database/models/User.js';
import { addBalance, formatMoney } from '../services/economyService.js';
import { addXp } from '../services/rpgService.js';

export const data = new SlashCommandBuilder()
  .setName('vote')
  .setDescription('Vote for Riya AI Girlfriend on top.gg and claim $25,000 & 250 XP!');

export const execute = async (interaction) => {
  const user = interaction.user;
  const userDoc = await getUserData(user.id, interaction.guildId);

  const now = Date.now();
  const lastVote = userDoc.cooldowns?.vote || 0;
  const VOTE_MS = 12 * 60 * 60 * 1000; // 12 hours

  if (now - lastVote < VOTE_MS) {
    const remainingMs = VOTE_MS - (now - lastVote);
    const hours = Math.floor(remainingMs / (60 * 60 * 1000));
    const mins = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
    return interaction.reply({
      content: `⏳ You already voted recently! You can vote again in **${hours}h ${mins}m**!`,
      ephemeral: true
    });
  }

  userDoc.cooldowns.vote = now;

  const voteReward = 25000;
  const xpReward = 250;

  await addBalance(userDoc, voteReward);
  const xpResult = addXp(userDoc, xpReward);
  await userDoc.save();

  const embed = new EmbedBuilder()
    .setTitle('💖 THANK YOU FOR VOTING!')
    .setColor('#FF69B4')
    .setDescription(`Aww thank you so much! Voting supports Riya\'s server costs! Here is your reward:`)
    .addFields(
      { name: '💵 Vote Bonus', value: formatMoney(voteReward), inline: true },
      { name: '⭐ XP Bonus', value: `+${xpReward} XP`, inline: true },
      { name: '👛 Wallet Balance', value: formatMoney(userDoc.balance), inline: true }
    )
    .setFooter({ text: xpResult.leveledUp ? `🎉 LEVEL UP! Level ${xpResult.newLevel}` : 'Riya AI Girlfriend • Vote again in 12 hours!' });

  return interaction.reply({ embeds: [embed] });
};
