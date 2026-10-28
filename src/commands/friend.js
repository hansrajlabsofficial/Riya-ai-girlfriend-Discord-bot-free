import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getUserData } from '../database/models/User.js';
import { sendFriendRequest, acceptFriendRequest, getFriendshipLevel } from '../services/friendService.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('friend')
  .setDescription('Manage your server friends & view friendship relationship levels!')
  .addSubcommand(sub =>
    sub.setName('add')
      .setDescription('Send a friend request to a server member')
      .addUserOption(opt => opt.setName('user').setDescription('The user to add as friend').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('accept')
      .setDescription('Accept a pending friend request')
      .addUserOption(opt => opt.setName('user').setDescription('The user whose request to accept').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('list')
      .setDescription('View your friends list and relationship levels')
  );

export const execute = async (interaction) => {
  try {
    const subcommand = interaction.options.getSubcommand();
    const userDoc = await getUserData(interaction.user.id, interaction.guildId);

    if (subcommand === 'add') {
      const targetUser = interaction.options.getUser('user');

      if (targetUser.id === interaction.user.id) {
        return await interaction.reply({ content: '❌ You cannot send a friend request to yourself, Baka!', ephemeral: true });
      }
      if (targetUser.bot) {
        return await interaction.reply({ content: '❌ Bots are already your automated companions! Choose a human friend!', ephemeral: true });
      }

      const targetDoc = await getUserData(targetUser.id, interaction.guildId);
      const result = await sendFriendRequest(userDoc, targetDoc);

      if (!result.success) {
        return await interaction.reply({ content: `❌ ${result.message}`, ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle('💌 Friend Request Sent!')
        .setDescription(
          `Hey <@${targetUser.id}>! <@${interaction.user.id}> wants to be your friend!\n\n` +
          `Click **Accept Friend Request 💖** below to become friends and level up your relationship together!`
        );

      const acceptBtn = new ButtonBuilder()
        .setCustomId(`accept_friend_${interaction.user.id}_${targetUser.id}`)
        .setLabel('Accept Friend Request 💖')
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder().addComponents(acceptBtn);

      const reqMsg = await interaction.reply({ content: `<@${targetUser.id}>`, embeds: [embed], components: [row], fetchReply: true });

      const filter = i => i.customId === `accept_friend_${interaction.user.id}_${targetUser.id}`;
      const collector = reqMsg.createMessageComponentCollector({ filter, time: 86400000 });

      collector.on('collect', async i => {
        if (i.user.id !== targetUser.id) {
          return await i.reply({ content: '❌ Only the recipient can accept this friend request!', ephemeral: true });
        }

        const freshUserDoc = await getUserData(interaction.user.id, interaction.guildId);
        const freshTargetDoc = await getUserData(targetUser.id, interaction.guildId);
        await acceptFriendRequest(freshTargetDoc, freshUserDoc);

        const successEmbed = new EmbedBuilder()
          .setColor('#00FF7F')
          .setTitle('🎉 Friend Request Accepted!')
          .setDescription(`💖 <@${interaction.user.id}> and <@${targetUser.id}> are now official friends!\n\nChat and send emojis to each other to increase your friendship relationship level!`);

        acceptBtn.setDisabled(true).setLabel('Friends 💖');
        await reqMsg.edit({ components: [new ActionRowBuilder().addComponents(acceptBtn)] }).catch(() => {});
        await i.reply({ embeds: [successEmbed] });
        collector.stop();
      });

      return;
    }

    if (subcommand === 'accept') {
      const targetUser = interaction.options.getUser('user');
      const senderDoc = await getUserData(targetUser.id, interaction.guildId);
      const result = await acceptFriendRequest(userDoc, senderDoc);

      if (!result.success) {
        return await interaction.reply({ content: `❌ ${result.message}`, ephemeral: true });
      }

      return await interaction.reply({ content: `🎉 You accepted <@${targetUser.id}>'s friend request! You are now friends! 💖` });
    }

    if (subcommand === 'list') {
      const friends = userDoc.friends || {};
      const friendIds = Object.keys(friends);

      if (friendIds.length === 0) {
        return await interaction.reply({
          content: '🌱 You don\'t have any friends added yet! Use `/friend add <user>` to send a friend request!',
          ephemeral: true
        });
      }

      let text = '';
      for (const fid of friendIds) {
        const info = getFriendshipLevel(userDoc, fid);
        text += `• <@${fid}> — Level **${info.level}** (${info.xp} XP) — \`${info.title}\`\n`;
      }

      const embed = new EmbedBuilder()
        .setColor('#FF1493')
        .setTitle(`🤝 ${interaction.user.username}'s Friends List`)
        .setDescription(text)
        .setFooter({ text: 'Send emojis to friends in chat to level up your friendship!' });

      return await interaction.reply({ embeds: [embed] });
    }

  } catch (error) {
    logger.error('Error executing /friend command:', error);
    await interaction.reply({ content: '❌ Failed to process friend command.', ephemeral: true });
  }
};
