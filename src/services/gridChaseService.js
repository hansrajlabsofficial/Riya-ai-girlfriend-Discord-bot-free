import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { getUserData, saveUserData } from '../database/models/User.js';
import { getBalance, addBalance, deductBalance, formatMoney } from './economyService.js';
import { logger } from '../utils/logger.js';

// In-memory registry of active matches keyed by message ID
export const activeMatches = new Map();

/**
 * Renders the 5x5 grid in Discord emoji format
 */
export function renderGrid(runner, hunter, obstacles, goal, runnerSmoked, isCaught) {
  let output = '';
  for (let r = 0; r < 5; r++) {
    let rowStr = '';
    for (let c = 0; c < 5; c++) {
      if (isCaught && r === hunter.r && c === hunter.c && r === runner.r && c === runner.c) {
        rowStr += '💥 ';
      } else if (r === hunter.r && c === hunter.c) {
        rowStr += '🚔 ';
      } else if (r === runner.r && c === runner.c) {
        rowStr += runnerSmoked ? '❓ ' : '🏃 ';
      } else if (r === goal.r && c === goal.c) {
        rowStr += '🚁 ';
      } else if (obstacles.has(`${r},${c}`)) {
        rowStr += '🚧 ';
      } else {
        rowStr += '⬛ ';
      }
    }
    output += rowStr.trim() + '\n';
  }
  return output.trim();
}

/**
 * Generates 3-4 random roadblocks while keeping start and extraction paths clear
 */
export function generateObstacles() {
  const obstacles = new Set();
  const forbidden = new Set([
    '0,4', // Goal Helipad
    '4,0', // Runner Start
    '0,0', // Hunter Start
    '0,3', // Helipad Access 1
    '1,4', // Helipad Access 2
    '4,1', // Runner Escape 1
    '3,0'  // Runner Escape 2
  ]);

  const candidateCells = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const key = `${r},${c}`;
      if (!forbidden.has(key)) {
        candidateCells.push(key);
      }
    }
  }

  candidateCells.sort(() => Math.random() - 0.5);

  const count = Math.random() < 0.5 ? 3 : 4;
  for (let i = 0; i < count && i < candidateCells.length; i++) {
    obstacles.add(candidateCells[i]);
  }

  return obstacles;
}

/**
 * Builds the interactive controls row for the active player
 */
export function buildControls(game) {
  const isRunnerTurn = (game.currentTurn === 'runner');

  const dirRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cm_move_up').setLabel('Up').setEmoji('⬆️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('cm_move_down').setLabel('Down').setEmoji('⬇️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('cm_move_left').setLabel('Left').setEmoji('⬅️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('cm_move_right').setLabel('Right').setEmoji('➡️').setStyle(ButtonStyle.Primary)
  );

  const powerRow = new ActionRowBuilder();

  if (isRunnerTurn) {
    powerRow.addComponents(
      new ButtonBuilder()
        .setCustomId('cm_power_smoke')
        .setLabel(game.runnerSmokeActive ? '💨 Smoke ACTIVE (Hidden)' : (game.runnerSmokeUsed ? '💨 Smoke Used' : '💨 Smoke Bomb (1x)'))
        .setStyle(game.runnerSmokeActive ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(game.runnerSmokeUsed || game.runnerSmokeActive)
    );
  } else {
    powerRow.addComponents(
      new ButtonBuilder()
        .setCustomId('cm_power_sprint')
        .setLabel(game.hunterSprintActive ? '⚡ Sprint ARMED (Next Move 2x)' : (game.hunterSprintUsed ? '⚡ Sprint Used' : '⚡ Siren Sprint (1x)'))
        .setStyle(game.hunterSprintActive ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(game.hunterSprintUsed || game.hunterSprintActive)
    );
  }

  return [dirRow, powerRow];
}

/**
 * Builds the board embed for the active round
 */
export function buildBoardEmbed(game) {
  const isRunnerTurn = (game.currentTurn === 'runner');
  const activeUser = isRunnerTurn ? game.runnerUser : game.hunterUser;
  const activeRole = isRunnerTurn ? '🏃 Runner' : '🚔 Hunter';

  const gridString = renderGrid(game.runner, game.hunter, game.obstacles, game.goal, game.runnerSmokeActive, false);

  const embed = new EmbedBuilder()
    .setColor(isRunnerTurn ? '#3498DB' : '#E74C3C')
    .setTitle(`🏙️ Tactical Grid Chase • Round ${game.round} / ${game.maxRounds}`)
    .setDescription(
      `\`\`\`\n${gridString}\n\`\`\`\n` +
      `🎯 **Round:** **${game.round} / ${game.maxRounds}**\n` +
      `👉 **Current Turn:** <@${activeUser.id}> (${activeRole})\n` +
      `*( ${game.lastMoveEvent} )*\n\n` +
      (game.bet > 0 ? `💰 **Wager Pot:** **${formatMoney(game.bet * 2)}**\n` : '') +
      `🚁 **Helipad Goal:** \`Row 1, Col 5 (Top-Right)\` | 🚧 **Roadblocks:** \`Active\`\n\n` +
      `*Use the direction buttons below to maneuver!*`
    )
    .setFooter({ text: '© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.' });

  return embed;
}

/**
 * Initializes and starts a new grid chase session
 */
export async function createGridChaseMatch(interaction, runnerUser, hunterUser, bet, guildId) {
  const goal = { r: 0, c: 4 };
  const runner = { r: 4, c: 0 };
  const hunter = { r: 0, c: 0 };
  const obstacles = generateObstacles();

  const game = {
    guildId,
    runnerId: runnerUser.id,
    hunterId: hunterUser.id,
    runnerUser,
    hunterUser,
    bet,
    round: 1,
    maxRounds: 10,
    currentTurn: 'runner',
    runner,
    hunter,
    goal,
    obstacles,
    runnerSmokeUsed: false,
    runnerSmokeActive: false,
    hunterSprintUsed: false,
    hunterSprintActive: false,
    lastMoveEvent: 'Match started! Runner moves first to escape the police dragnet.'
  };

  const replyMsg = await interaction.editReply({
    content: null,
    embeds: [buildBoardEmbed(game)],
    components: buildControls(game)
  });

  game.messageId = replyMsg.id;
  activeMatches.set(replyMsg.id, game);

  // Set 15-minute global cleanup timer for this match
  setTimeout(() => {
    if (activeMatches.has(replyMsg.id)) {
      activeMatches.delete(replyMsg.id);
    }
  }, 15 * 60 * 1000);

  return game;
}

/**
 * Global Button Click Handler for all cm_ buttons (Routed via interactionCreate.js)
 */
export async function handleGridChaseButton(interaction) {
  const customId = interaction.customId;
  const messageId = interaction.message.id;

  // 1. Handle Challenge Acceptance / Decline
  if (customId.startsWith('cm_accept_') || customId.startsWith('cm_decline_')) {
    const parts = customId.split('_');
    const action = parts[1];
    const opponentId = parts[2];

    if (interaction.user.id !== opponentId) {
      return await interaction.reply({
        content: `❌ **Anti-Cheat Warning:** Only <@${opponentId}> can respond to this challenge!`,
        ephemeral: true
      });
    }

    if (action === 'decline') {
      return await interaction.update({
        content: `❌ <@${opponentId}> declined the Tactical Grid Chase challenge.`,
        embeds: [],
        components: []
      });
    }

    // Accept match: parse bet and challenger from original message
    const origEmbed = interaction.message.embeds?.[0];
    const desc = origEmbed?.description || '';
    const betMatch = desc.match(/\$(\d[\d,]*)/);
    let bet = 0;
    if (betMatch) {
      bet = parseInt(betMatch[1].replace(/,/g, ''), 10) / 2;
    }

    const runnerMatch = desc.match(/Runner:\*\* <@(\d+)>/);
    const runnerId = runnerMatch ? runnerMatch[1] : null;

    if (!runnerId) {
      return await interaction.update({
        content: '❌ Could not retrieve challenger info. Please run /catchme again.',
        embeds: [],
        components: []
      });
    }

    const challengerUser = await interaction.client.users.fetch(runnerId).catch(() => null);
    if (!challengerUser) {
      return await interaction.update({
        content: '❌ Challenger could not be found. Match cancelled.',
        embeds: [],
        components: []
      });
    }

    // Deduct wagers if bet > 0
    if (bet > 0) {
      const cDoc = await getUserData(challengerUser.id, interaction.guildId);
      const oDoc = await getUserData(interaction.user.id, interaction.guildId);

      if (getBalance(cDoc) < bet || getBalance(oDoc) < bet) {
        return await interaction.update({
          content: '❌ Match cancelled! One of the players no longer has enough balance.',
          embeds: [],
          components: []
        });
      }

      await deductBalance(cDoc, bet);
      await deductBalance(oDoc, bet);
      await saveUserData(cDoc);
      await saveUserData(oDoc);
    }

    // Launch game directly on this message
    await interaction.deferUpdate().catch(() => {});
    await createGridChaseMatch(interaction, challengerUser, interaction.user, bet, interaction.guildId);
    return;
  }

  // 2. Handle Active Game Buttons
  const game = activeMatches.get(messageId);
  if (!game) {
    return await interaction.reply({
      content: '💡 **Match Session Expired:** This match session has expired or ended. Please run **/catchme** to start a fresh match!',
      ephemeral: true
    });
  }

  const isRunnerTurn = (game.currentTurn === 'runner');
  const activeUserId = isRunnerTurn ? game.runnerId : game.hunterId;
  const activeUser = isRunnerTurn ? game.runnerUser : game.hunterUser;

  // Anti-Cheat: Only the active player whose turn it is can move
  if (interaction.user.id !== activeUserId) {
    return await interaction.reply({
      content: `❌ **Anti-Cheat Warning:** It is not your turn! Currently waiting for <@${activeUserId}> (${isRunnerTurn ? '🏃 Runner' : '🚔 Hunter'}) to move.`,
      ephemeral: true
    });
  }

  // Handle Smoke Bomb
  if (customId === 'cm_power_smoke') {
    if (!isRunnerTurn || game.runnerSmokeUsed) {
      return await interaction.reply({ content: '❌ Smoke Bomb is not available right now!', ephemeral: true });
    }
    game.runnerSmokeUsed = true;
    game.runnerSmokeActive = true;
    game.lastMoveEvent = `💨 Runner <@${game.runnerId}> deployed a Smoke Bomb! Position is hidden on the radar!`;
    return await interaction.update({
      embeds: [buildBoardEmbed(game)],
      components: buildControls(game)
    });
  }

  // Handle Sprint Boost
  if (customId === 'cm_power_sprint') {
    if (isRunnerTurn || game.hunterSprintUsed) {
      return await interaction.reply({ content: '❌ Siren Sprint is not available right now!', ephemeral: true });
    }
    game.hunterSprintActive = true;
    game.lastMoveEvent = `⚡ Hunter <@${game.hunterId}> activated Siren Sprint! Next move will jump 2 tiles forward!`;
    return await interaction.update({
      embeds: [buildBoardEmbed(game)],
      components: buildControls(game)
    });
  }

  // Handle Directions
  let dRow = 0;
  let dCol = 0;
  let dirName = '';

  if (customId === 'cm_move_up') { dRow = -1; dirName = 'Up'; }
  else if (customId === 'cm_move_down') { dRow = 1; dirName = 'Down'; }
  else if (customId === 'cm_move_left') { dCol = -1; dirName = 'Left'; }
  else if (customId === 'cm_move_right') { dCol = 1; dirName = 'Right'; }
  else return;

  const actor = isRunnerTurn ? game.runner : game.hunter;
  const isSprinting = (!isRunnerTurn && game.hunterSprintActive);
  const stepDistance = isSprinting ? 2 : 1;

  const nextR = actor.r + (dRow * stepDistance);
  const nextC = actor.c + (dCol * stepDistance);

  // Boundary check
  if (nextR < 0 || nextR > 4 || nextC < 0 || nextC > 4) {
    return await interaction.reply({
      content: `⚠️ **Perimeter Blocked:** Moving ${dirName} would take you outside the 5×5 city limits!`,
      ephemeral: true
    });
  }

  // Roadblock check
  if (isSprinting) {
    const midR = actor.r + dRow;
    const midC = actor.c + dCol;
    if (game.obstacles.has(`${midR},${midC}`) || game.obstacles.has(`${nextR},${nextC}`)) {
      return await interaction.reply({
        content: `🚧 **Obstacle Collision:** A roadblock is blocking that 2-tile sprint lane! Try another direction.`,
        ephemeral: true
      });
    }
  } else {
    if (game.obstacles.has(`${nextR},${nextC}`)) {
      return await interaction.reply({
        content: `🚧 **Roadblock:** A concrete barricade is blocking tile (${nextR + 1}, ${nextC + 1})! Choose another path.`,
        ephemeral: true
      });
    }
  }

  // Execute Move
  actor.r = nextR;
  actor.c = nextC;

  if (isSprinting) {
    game.hunterSprintUsed = true;
    game.hunterSprintActive = false;
    game.lastMoveEvent = `⚡ Hunter sprinted 2 tiles ${dirName}!`;
  } else {
    game.lastMoveEvent = `${isRunnerTurn ? '🏃 Runner' : '🚔 Hunter'} moved ${dirName}.`;
  }

  // Turn off Smoke Bomb after Runner's move finishes
  if (isRunnerTurn && game.runnerSmokeActive) {
    game.runnerSmokeActive = false;
  }

  // Win Condition 1: Hunter catches Runner
  if (game.hunter.r === game.runner.r && game.hunter.c === game.runner.c) {
    activeMatches.delete(messageId);

    if (game.bet > 0) {
      const freshHunter = await getUserData(game.hunterId, game.guildId);
      await addBalance(freshHunter, game.bet * 2);
      await saveUserData(freshHunter);
    }

    const bustedGrid = renderGrid(game.runner, game.hunter, game.obstacles, game.goal, false, true);

    const winEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('🚨 BUSTED! The Hunter Wins! 🚔')
      .setDescription(
        `\`\`\`\n${bustedGrid}\n\`\`\`\n` +
        `💥 **TAKEDOWN!** <@${game.hunterId}> intercepted and tackled <@${game.runnerId}> on **Round ${game.round}**!\n\n` +
        (game.bet > 0 ? `💰 **Wager Pot Won:** **+${formatMoney(game.bet * 2)}** *(Net Profit: +${formatMoney(game.bet)})*\n\n` : '') +
        `*Amdavadi Riya says: "Khel khatam, paisa hazam! What an aggressive interception, baka!"* 🚔💥`
      )
      .setThumbnail('https://cdn-icons-png.flaticon.com/512/808/808439.png')
      .setFooter({ text: '© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.' });

    return await interaction.update({
      embeds: [winEmbed],
      components: []
    });
  }

  // Win Condition 2: Runner reaches extraction helicopter
  if (isRunnerTurn && game.runner.r === game.goal.r && game.runner.c === game.goal.c) {
    activeMatches.delete(messageId);

    if (game.bet > 0) {
      const freshRunner = await getUserData(game.runnerId, game.guildId);
      await addBalance(freshRunner, game.bet * 2);
      await saveUserData(freshRunner);
    }

    const escapeGrid = renderGrid(game.runner, game.hunter, game.obstacles, game.goal, false, false);

    const escapeEmbed = new EmbedBuilder()
      .setColor('#00FF7F')
      .setTitle('🚁 EXTRACTION SUCCESSFUL! The Runner Wins! 🏃')
      .setDescription(
        `\`\`\`\n${escapeGrid}\n\`\`\`\n` +
        `🎉 <@${game.runnerId}> reached the helipad and boarded the extraction helicopter!\n\n` +
        (game.bet > 0 ? `💰 **Wager Pot Won:** **+${formatMoney(game.bet * 2)}** *(Net Profit: +${formatMoney(game.bet)})*\n\n` : '') +
        `*Amdavadi Riya says: "Wah baka, what speed! Left the police squad eating dust at the rooftop!"* 🚁💨`
      )
      .setThumbnail('https://cdn-icons-png.flaticon.com/512/808/808439.png')
      .setFooter({ text: '© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.' });

    return await interaction.update({
      embeds: [escapeEmbed],
      components: []
    });
  }

  // Switch Turn
  if (isRunnerTurn) {
    game.currentTurn = 'hunter';
  } else {
    game.currentTurn = 'runner';
    game.round++;

    // Win Condition 3: Turn limit expires (10 rounds ended)
    if (game.round > game.maxRounds) {
      activeMatches.delete(messageId);

      if (game.bet > 0) {
        const freshRunner = await getUserData(game.runnerId, game.guildId);
        await addBalance(freshRunner, game.bet * 2);
        await saveUserData(freshRunner);
      }

      const timeoutGrid = renderGrid(game.runner, game.hunter, game.obstacles, game.goal, false, false);

      const timeEmbed = new EmbedBuilder()
        .setColor('#00FF7F')
        .setTitle('⏱️ TIME EXPIRED! The Runner Escaped! 🏃')
        .setDescription(
          `\`\`\`\n${timeoutGrid}\n\`\`\`\n` +
          `🏃 <@${game.runnerId}> outmaneuvered the Hunter and survived all **${game.maxRounds} full rounds** without getting caught!\n\n` +
          (game.bet > 0 ? `💰 **Wager Pot Won:** **+${formatMoney(game.bet * 2)}** *(Net Profit: +${formatMoney(game.bet)})*\n\n` : '') +
          `*Amdavadi Riya says: "Runner disappeared into the crowded city alleyways and vanished! Well played!"* 🌃✨`
        )
        .setThumbnail('https://cdn-icons-png.flaticon.com/512/808/808439.png')
        .setFooter({ text: '© 2026 | Developed by HL.Hansraj Labs | All Rights Reserved.' });

      return await interaction.update({
        embeds: [timeEmbed],
        components: []
      });
    }
  }

  // Update board for next turn
  await interaction.update({
    embeds: [buildBoardEmbed(game)],
    components: buildControls(game)
  });
}
