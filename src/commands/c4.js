import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getUserData } from '../database/models/User.js';
import { getBalance, addBalance, deductBalance, formatMoney } from '../services/economyService.js';

export const data = new SlashCommandBuilder()
  .setName('c4')
  .setDescription('Challenge another user to a Wager Connect Four match!')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('The user you want to challenge')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('bet')
      .setDescription('Wager amount per player')
      .setRequired(true));

export const execute = async (interaction) => {
  const opponent = interaction.options.getUser('user');
  const bet = interaction.options.getInteger('bet');
  const challenger = interaction.user;

  if (opponent.id === challenger.id) return interaction.reply({ content: '❌ You cannot play against yourself!', ephemeral: true });
  if (opponent.bot) return interaction.reply({ content: '🤖 You cannot challenge a bot!', ephemeral: true });
  if (bet < 100) return interaction.reply({ content: '❌ Minimum bet for Connect Four is $100!', ephemeral: true });

  const cDoc = await getUserData(challenger.id, interaction.guildId);
  const oDoc = await getUserData(opponent.id, interaction.guildId);

  if (getBalance(cDoc) < bet) return interaction.reply({ content: `❌ You do not have **${formatMoney(bet)}** in your wallet!`, ephemeral: true });
  if (getBalance(oDoc) < bet) return interaction.reply({ content: `❌ **${opponent.username}** does not have **${formatMoney(bet)}** in their wallet!`, ephemeral: true });

  const acceptRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('c4_accept').setLabel(`🟡 Accept Match (${formatMoney(bet)})`).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('c4_decline').setLabel('❌ Decline').setStyle(ButtonStyle.Danger)
  );

  const initEmbed = new EmbedBuilder()
    .setTitle('🔴🟡 Connect Four Wager Challenge')
    .setColor('#FFD700')
    .setDescription(`**${challenger.username}** (🔴) challenges **${opponent.username}** (🟡) to Connect Four!\n\n**Wager Pot:** ${formatMoney(bet * 2)}\n\n**${opponent.username}**, do you accept?`)
    .setFooter({ text: 'Riya AI Girlfriend • Connect Four Wager' });

  const msg = await interaction.reply({ content: `<@${opponent.id}>`, embeds: [initEmbed], components: [acceptRow], fetchReply: true });

  const filter = i => i.user.id === opponent.id;
  const acceptCollector = msg.createMessageComponentCollector({ filter, time: 60000 });

  acceptCollector.on('collect', async i => {
    if (i.customId === 'c4_decline') {
      return i.update({ content: `❌ **${opponent.username}** declined the match.`, embeds: [], components: [] });
    }

    acceptCollector.stop('accepted');
    const freshC = await getUserData(challenger.id, interaction.guildId);
    const freshO = await getUserData(opponent.id, interaction.guildId);

    if (getBalance(freshC) < bet || getBalance(freshO) < bet) {
      return i.update({ content: '❌ Match canceled! Insufficient funds.', embeds: [], components: [] });
    }

    await deductBalance(freshC, bet);
    await deductBalance(freshO, bet);

    // 6 rows x 7 cols grid (0 = empty, 1 = Red 🔴, 2 = Yellow 🟡)
    const board = Array(6).fill(null).map(() => Array(7).fill(0));
    let turnUser = challenger;
    let turnNum = 1; // 1 = Red (Challenger), 2 = Yellow (Opponent)

    const renderBoardText = () => {
      let text = '1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣\n';
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 7; c++) {
          const val = board[r][c];
          text += val === 1 ? '🔴' : val === 2 ? '🟡' : '⚪';
        }
        text += '\n';
      }
      return text;
    };

    const getColButtons = () => {
      const row = new ActionRowBuilder();
      for (let c = 0; c < 7; c++) {
        const isFull = board[0][c] !== 0;
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`col_${c}`)
            .setLabel(`${c + 1}`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(isFull)
        );
      }
      return [row];
    };

    const checkWin = () => {
      // Horizontal, Vertical, Diagonal checks
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 7; c++) {
          const p = board[r][c];
          if (p === 0) continue;
          if (c + 3 < 7 && p === board[r][c+1] && p === board[r][c+2] && p === board[r][c+3]) return p;
          if (r + 3 < 6 && p === board[r+1][c] && p === board[r+2][c] && p === board[r+3][c]) return p;
          if (r + 3 < 6 && c + 3 < 7 && p === board[r+1][c+1] && p === board[r+2][c+2] && p === board[r+3][c+3]) return p;
          if (r + 3 < 6 && c - 3 >= 0 && p === board[r+1][c-1] && p === board[r+2][c-2] && p === board[r+3][c-3]) return p;
        }
      }
      if (board.every(row => row.every(cell => cell !== 0))) return 'DRAW';
      return null;
    };

    const getEmbed = () => new EmbedBuilder()
      .setTitle('🔴🟡 Connect Four Match in Progress')
      .setColor('#00FFFF')
      .setDescription(`${renderBoardText()}\n\n👉 **Turn:** <@${turnUser.id}> (${turnNum === 1 ? '🔴' : '🟡'})`)
      .setFooter({ text: 'Riya AI Girlfriend • Click column 1-7 to drop token!' });

    await i.update({ content: null, embeds: [getEmbed()], components: getColButtons() });

    const gameCollector = msg.createMessageComponentCollector({ time: 180000 });

    gameCollector.on('collect', async gi => {
      if (gi.user.id !== turnUser.id) {
        return gi.reply({ content: `⏳ It is <@${turnUser.id}>'s turn!`, ephemeral: true });
      }

      const col = parseInt(gi.customId.replace('col_', ''));
      // Drop token down column
      let droppedRow = -1;
      for (let r = 5; r >= 0; r--) {
        if (board[r][col] === 0) {
          board[r][col] = turnNum;
          droppedRow = r;
          break;
        }
      }

      if (droppedRow === -1) {
        return gi.reply({ content: '❌ Column is full!', ephemeral: true });
      }

      const winner = checkWin();
      if (winner) {
        gameCollector.stop('finished');
        if (winner === 'DRAW') {
          const fC = await getUserData(challenger.id, interaction.guildId);
          const fO = await getUserData(opponent.id, interaction.guildId);
          await addBalance(fC, bet);
          await addBalance(fO, bet);

          const drawEmbed = new EmbedBuilder()
            .setTitle('⚖️ CONNECT FOUR DRAW!')
            .setColor('#FFFF00')
            .setDescription(`${renderBoardText()}\n\nThe grid is completely full! Both players refunded **${formatMoney(bet)}**.`)
            .setFooter({ text: 'Riya AI Girlfriend • Draw' });

          return gi.update({ embeds: [drawEmbed], components: [] });
        } else {
          const winningUser = winner === 1 ? challenger : opponent;
          const winnerDoc = await getUserData(winningUser.id, interaction.guildId);
          const totalPot = bet * 2;

          await addBalance(winnerDoc, totalPot);
          await winnerDoc.save();

          const winEmbed = new EmbedBuilder()
            .setTitle(`🎉 CONNECT FOUR WINNER: ${winningUser.username}!`)
            .setColor('#00FF7F')
            .setDescription(`${renderBoardText()}\n\n🏆 4-IN-A-ROW! <@${winningUser.id}> won the match and collected **${formatMoney(totalPot)}**!`)
            .setFooter({ text: 'Riya AI Girlfriend • Connect Four Champion!' });

          return gi.update({ embeds: [winEmbed], components: [] });
        }
      } else {
        turnUser = turnUser.id === challenger.id ? opponent : challenger;
        turnNum = turnNum === 1 ? 2 : 1;
        return gi.update({ embeds: [getEmbed()], components: getColButtons() });
      }
    });
  });
};
