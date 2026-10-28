import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getUserData } from '../database/models/User.js';
import { getBalance, addBalance, deductBalance, formatMoney } from '../services/economyService.js';

export const data = new SlashCommandBuilder()
  .setName('ttt')
  .setDescription('Challenge another user to a Wager Tic-Tac-Toe match!')
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
  if (bet < 100) return interaction.reply({ content: '❌ Minimum bet for Tic-Tac-Toe is $100!', ephemeral: true });

  const cDoc = await getUserData(challenger.id, interaction.guildId);
  const oDoc = await getUserData(opponent.id, interaction.guildId);

  if (getBalance(cDoc) < bet) return interaction.reply({ content: `❌ You do not have **${formatMoney(bet)}** in your wallet!`, ephemeral: true });
  if (getBalance(oDoc) < bet) return interaction.reply({ content: `❌ **${opponent.username}** does not have **${formatMoney(bet)}** in their wallet!`, ephemeral: true });

  const acceptRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ttt_accept').setLabel(`⚔️ Accept Match (${formatMoney(bet)})`).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('ttt_decline').setLabel('❌ Decline').setStyle(ButtonStyle.Danger)
  );

  const initEmbed = new EmbedBuilder()
    .setTitle('❌⭕ Tic-Tac-Toe Wager Challenge')
    .setColor('#FF00FF')
    .setDescription(`**${challenger.username}** (❌) challenges **${opponent.username}** (⭕) to a Tic-Tac-Toe match!\n\n**Wager Pot:** ${formatMoney(bet * 2)} (${formatMoney(bet)} each)\n\n**${opponent.username}**, do you accept?`)
    .setFooter({ text: 'Riya AI Girlfriend • Wager Minigame' });

  const msg = await interaction.reply({ content: `<@${opponent.id}>`, embeds: [initEmbed], components: [acceptRow], fetchReply: true });

  const filter = i => i.user.id === opponent.id;
  const acceptCollector = msg.createMessageComponentCollector({ filter, time: 60000 });

  acceptCollector.on('collect', async i => {
    if (i.customId === 'ttt_decline') {
      acceptCollector.stop('declined');
      return i.update({ content: `❌ **${opponent.username}** declined the match.`, embeds: [], components: [] });
    }

    // Accept match! Deduct wager from both
    acceptCollector.stop('accepted');
    const freshC = await getUserData(challenger.id, interaction.guildId);
    const freshO = await getUserData(opponent.id, interaction.guildId);

    if (getBalance(freshC) < bet || getBalance(freshO) < bet) {
      return i.update({ content: '❌ Match canceled! One of the players no longer has enough balance.', embeds: [], components: [] });
    }

    await deductBalance(freshC, bet);
    await deductBalance(freshO, bet);
    await freshC.save();
    await freshO.save();

    // Start TTT Game State
    let board = Array(9).fill(null);
    let turnUser = challenger;
    let turnSymbol = '❌';

    const getBoardComponents = (disabled = false) => {
      const rows = [];
      for (let r = 0; r < 3; r++) {
        const row = new ActionRowBuilder();
        for (let c = 0; c < 3; c++) {
          const idx = r * 3 + c;
          const symbol = board[idx] || ' ';
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`pos_${idx}`)
              .setLabel(symbol)
              .setStyle(symbol === '❌' ? ButtonStyle.Danger : symbol === '⭕' ? ButtonStyle.Primary : ButtonStyle.Secondary)
              .setDisabled(disabled || board[idx] !== null)
          );
        }
        rows.push(row);
      }
      return rows;
    };

    const checkWin = () => {
      const wins = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
      ];
      for (const [a, b, c] of wins) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
      }
      if (board.every(cell => cell !== null)) return 'DRAW';
      return null;
    };

    const gameEmbed = () => new EmbedBuilder()
      .setTitle('❌⭕ Tic-Tac-Toe Match in Progress')
      .setColor('#00FFFF')
      .setDescription(`**Challenger:** ${challenger.username} (❌)\n**Opponent:** ${opponent.username} (⭕)\n**Total Wager Pot:** ${formatMoney(bet * 2)}\n\n👉 **Current Turn:** <@${turnUser.id}> (${turnSymbol})`)
      .setFooter({ text: 'Riya AI Girlfriend • Select your move!' });

    await i.update({ content: null, embeds: [gameEmbed()], components: getBoardComponents() });

    const gameCollector = msg.createMessageComponentCollector({ time: 120000 });

    gameCollector.on('collect', async gi => {
      if (gi.user.id !== turnUser.id) {
        return gi.reply({ content: `⏳ It is <@${turnUser.id}>'s turn right now!`, ephemeral: true });
      }

      const pos = parseInt(gi.customId.replace('pos_', ''));
      board[pos] = turnSymbol;

      const result = checkWin();
      if (result) {
        gameCollector.stop('finished');
        if (result === 'DRAW') {
          // Refund wagers
          const fC = await getUserData(challenger.id, interaction.guildId);
          const fO = await getUserData(opponent.id, interaction.guildId);
          await addBalance(fC, bet);
          await addBalance(fO, bet);
          await fC.save();
          await fO.save();

          const drawEmbed = new EmbedBuilder()
            .setTitle('⚖️ TIC-TAC-TOE DRAW!')
            .setColor('#FFFF00')
            .setDescription(`Good match! The board is full and the game ended in a draw!\n\nBoth players received their **${formatMoney(bet)}** wager back.`)
            .setFooter({ text: 'Riya AI Girlfriend • Draw / Push' });

          return gi.update({ embeds: [drawEmbed], components: getBoardComponents(true) });
        } else {
          // WINNER TAKES ALL!
          const winnerUser = result === '❌' ? challenger : opponent;
          const winnerDoc = await getUserData(winnerUser.id, interaction.guildId);
          const totalPot = bet * 2;

          await addBalance(winnerDoc, totalPot);
          await winnerDoc.save();

          const winEmbed = new EmbedBuilder()
            .setTitle(`🎉 TIC-TAC-TOE WINNER: ${winnerUser.username}!`)
            .setColor('#00FF7F')
            .setDescription(`GG! **${winnerUser.username}** (${result}) got 3-in-a-row and won the match!\n\n**Wager Pot Collected:** ${formatMoney(totalPot)}`)
            .setFooter({ text: 'Riya AI Girlfriend • Tic-Tac-Toe Champion!' });

          return gi.update({ embeds: [winEmbed], components: getBoardComponents(true) });
        }
      } else {
        // Swap turn
        turnUser = turnUser.id === challenger.id ? opponent : challenger;
        turnSymbol = turnSymbol === '❌' ? '⭕' : '❌';
        return gi.update({ embeds: [gameEmbed()], components: getBoardComponents() });
      }
    });
  });
};
