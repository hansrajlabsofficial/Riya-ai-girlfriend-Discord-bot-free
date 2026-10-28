import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserData } from '../database/models/User.js';

export const data = new SlashCommandBuilder()
  .setName('bestie')
  .setDescription('Calculate your official friendship bond score with a friend!')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('Your friend')
      .setRequired(true));

export const execute = async (interaction) => {
  const target = interaction.options.getUser('user');
  const user = interaction.user;

  if (target.id === user.id) return interaction.reply({ content: '❌ You are already your own bestie! 💕', ephemeral: true });

  const uDoc = await getUserData(user.id, interaction.guildId);
  const friendData = uDoc.friends?.[target.id];

  const friendLevel = friendData ? friendData.level : 1;
  const friendXp = friendData ? friendData.xp : 0;

  // Calculate compatibility score deterministic seed
  const combinedId = parseInt(user.id.slice(-4)) + parseInt(target.id.slice(-4));
  const baseScore = (combinedId % 40) + 60; // 60% to 99%

  const embed = new EmbedBuilder()
    .setTitle('👩‍❤️‍👩 Bestie Friendship Bond')
    .setThumbnail(target.displayAvatarURL({ dynamic: true }))
    .setColor('#FFB6C1')
    .setDescription(`Friendship analysis between **${user.username}** and **${target.username}**!`)
    .addFields(
      { name: '🤝 Friendship Level', value: `Level ${friendLevel}`, inline: true },
      { name: '💖 Friendship XP', value: `${friendXp} XP`, inline: true },
      { name: '✨ Bestie Compatibility', value: `**${baseScore}% Inseparable Besties!**`, inline: true }
    )
    .setFooter({ text: 'Riya AI Girlfriend • Send emojis with /friend to level up!' });

  return interaction.reply({ embeds: [embed] });
};
