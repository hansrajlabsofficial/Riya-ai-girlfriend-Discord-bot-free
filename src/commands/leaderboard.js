import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getGuildLeaderboard, isUserDailyPartner } from '../services/rpgService.js';
import { getFishingLeaderboard } from '../services/fishingService.js';
import { formatMoney } from '../services/economyService.js';
import { triggerDailyDatingInvite } from '../utils/dailyDatingEvent.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('View top minigame, quiz, XP, and Fishing Hall of Fame leaderboards!')
  .addSubcommand(sub => sub.setName('xp').setDescription('Shows you a leaderboard with the most active minigames players'))
  .addSubcommand(sub =>
    sub.setName('fishing')
      .setDescription('Hall of Fame: Top fishers by heaviest catch, rarest catch, and net earnings!')
      .addStringOption(opt =>
        opt.setName('metric')
          .setDescription('Choose ranking metric')
          .setRequired(false)
          .addChoices(
            { name: '⚖️ Heaviest Catch (Single heaviest fish in kg)', value: 'heaviest' },
            { name: '💰 Net Earnings (Total coins earned selling catches)', value: 'earnings' },
            { name: '🎣 Total Catches (Most sea creatures caught)', value: 'caught' }
          )
      )
  )
  .addSubcommand(sub => sub.setName('emojiquiz').setDescription('Shows you the top 10 emojiquiz players'))
  .addSubcommand(sub => sub.setName('antonymquiz').setDescription('Shows you the top 10 antonymquiz players'))
  .addSubcommand(sub => sub.setName('triviaquiz').setDescription('Shows you the top 10 triviaquiz players'))
  .addSubcommand(sub => sub.setName('connectfour').setDescription('Shows the Connect Four leaderboard'))
  .addSubcommand(sub => sub.setName('counting').setDescription('Shows you the top 10 counting servers'));

export const execute = async (interaction) => {
  await interaction.deferReply().catch(() => {});

  try {
    const subcommand = interaction.options.getSubcommand() || 'xp';
    const guildId = interaction.guildId || 'dm';

    // Handle Fishing Hall of Fame
    if (subcommand === 'fishing') {
      const metric = interaction.options.getString('metric') || 'heaviest';
      const fishLeaderboard = await getFishingLeaderboard(guildId, metric, 10);

      const metricTitles = {
        heaviest: '⚖️ Heaviest Catch (Single Biggest Specimen)',
        earnings: '💰 Net Fishing Market Earnings',
        caught: '🎣 Most Sea Creatures Landed'
      };

      const embed = new EmbedBuilder()
        .setColor('#00CED1')
        .setTitle(`🎣 Fishing Hall of Fame: ${metricTitles[metric]}`)
        .setDescription('Honoring the greatest anglers across the oceans! 🌊')
        .setFooter({ text: '© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.' })
        .setTimestamp();

      if (!fishLeaderboard || fishLeaderboard.length === 0) {
        embed.setDescription('No fishing records registered yet! Cast your line with **/fish** to enter the Hall of Fame!');
      } else {
        let text = '';
        fishLeaderboard.forEach((u, index) => {
          const medal = index === 0 ? '👑 #1' : index === 1 ? '🥈 #2' : index === 2 ? '🥉 #3' : `#${index + 1}`;
          const fStats = u.fishing?.stats || {};
          
          if (metric === 'earnings') {
            text += `${medal} <@${u.userId}> — Net Sales: **${formatMoney(fStats.totalEarnings || 0)}**\n`;
          } else if (metric === 'caught') {
            const count = fStats.totalCaught || u.fishing?.catches?.length || 0;
            text += `${medal} <@${u.userId}> — Landed: **${count} catch${count === 1 ? '' : 'es'}**\n`;
          } else {
            // Heaviest
            const h = fStats.heaviestCatch;
            if (h) {
              text += `${medal} <@${u.userId}> — ${h.emoji} **${h.name}** (\`${h.weightKg?.toFixed(1)}kg\` • **${formatMoney(h.value)}**)\n`;
            } else {
              text += `${medal} <@${u.userId}> — *No catch recorded*\n`;
            }
          }
        });
        embed.addFields({ name: '🏆 Top Anglers', value: text });
      }

      return await interaction.editReply({ embeds: [embed] });
    }

    // Default minigames and RPG leaderboards
    const leaderboard = await getGuildLeaderboard(guildId, 10);

    const titles = {
      xp: '🏆 Riya\'s Affection & XP Leaderboard',
      emojiquiz: '🧩 Top 10 EmojiQuiz Champions',
      antonymquiz: '📝 Top 10 AntonymQuiz Champions',
      triviaquiz: '❓ Top 10 TriviaQuiz Champions',
      connectfour: '🔴🟡 Top Connect Four Champions',
      counting: '🔢 Top Counting Server Champions'
    };

    const embed = new EmbedBuilder()
      .setColor('#FF1493')
      .setTitle(titles[subcommand] || '🏆 Leaderboard')
      .setDescription('Top players competing on the leaderboard!')
      .setFooter({ text: '© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.' });

    if (!leaderboard || leaderboard.length === 0) {
      embed.setDescription('No stats found yet! Play minigames and chat with Riya to get on the leaderboard! ☕✨');
    } else {
      let text = '';
      leaderboard.forEach((u, index) => {
        const medal = index === 0 ? '👑 #1' : index === 1 ? '🥈 #2' : index === 2 ? '🥉 #3' : `#${index + 1}`;
        const tagStatus = isUserDailyPartner(u) ? ` \`[${u.datingTag}]\`` : '';
        text += `${medal} <@${u.userId}> — Level **${u.level || 1}** (${u.xp || 0} XP)${tagStatus}\n`;
      });
      embed.addFields({ name: '📊 Top Champions', value: text });
    }

    const inviteBtn = new ButtonBuilder()
      .setCustomId('trigger_daily_date_invite')
      .setLabel('Send Daily Date Invite (Admin/Top User)')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(inviteBtn);

    const replyMsg = await interaction.editReply({ embeds: [embed], components: [row] });

    const filter = i => i.customId === 'trigger_daily_date_invite';
    const collector = replyMsg.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
      await i.reply({ content: '💌 Triggering daily dating invitation in the channel...', ephemeral: true });
      if (interaction.guild) {
        await triggerDailyDatingInvite(interaction.guild, interaction.client);
      }
    });

  } catch (error) {
    logger.error('Error executing /leaderboard command:', error);
    await interaction.editReply({ content: '❌ Failed to fetch leaderboard.' }).catch(() => {});
  }
};
