import {
  SlashCommandBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { getUserData, saveUserData } from '../database/models/User.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('ship')
  .setDescription('Calculate love compatibility % & pair with another user!')
  .addUserOption(opt => opt.setName('user1').setDescription('First user').setRequired(true))
  .addUserOption(opt => opt.setName('user2').setDescription('Second user (optional)').setRequired(false));

/**
 * Draws a clean pink heart path on the canvas
 */
function drawHeart(ctx, x, y, width, height, color) {
  ctx.save();
  ctx.beginPath();
  const topCurveHeight = height * 0.3;
  ctx.moveTo(x, y + topCurveHeight);
  ctx.bezierCurveTo(x, y, x - width / 2, y, x - width / 2, y + topCurveHeight);
  ctx.bezierCurveTo(
    x - width / 2,
    y + (height + topCurveHeight) / 2,
    x,
    y + height,
    x,
    y + height
  );
  ctx.bezierCurveTo(
    x,
    y + height,
    x + width / 2,
    y + (height + topCurveHeight) / 2,
    x + width / 2,
    y + topCurveHeight
  );
  ctx.bezierCurveTo(x + width / 2, y, x, y, x, y + topCurveHeight);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/**
 * Renders the high-resolution Cosmic Ship Graphic (800x420) matching the reference design!
 */
async function renderShipCanvas(user1, user2, score) {
  const width = 800;
  const height = 420;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 1. Cosmic Space Gradient Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0B001A');
  bgGrad.addColorStop(0.4, '#1F0038');
  bgGrad.addColorStop(0.8, '#3A004C');
  bgGrad.addColorStop(1, '#1A002E');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Stars & Nebula Dust Glows
  for (let i = 0; i < 60; i++) {
    const starX = (Math.sin(i * 123.4) * 0.5 + 0.5) * width;
    const starY = (Math.cos(i * 567.8) * 0.5 + 0.5) * height;
    const starRadius = (i % 3) + 1;
    const opacity = ((i % 5) + 3) / 10;
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.beginPath();
    ctx.arc(starX, starY, starRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cyan & Pink Nebula Soft Circles
  const cyanGlow = ctx.createRadialGradient(240, 200, 10, 240, 200, 250);
  cyanGlow.addColorStop(0, 'rgba(0, 240, 255, 0.25)');
  cyanGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = cyanGlow;
  ctx.fillRect(0, 0, width, height);

  const pinkGlow = ctx.createRadialGradient(560, 200, 10, 560, 200, 250);
  pinkGlow.addColorStop(0, 'rgba(255, 0, 127, 0.3)');
  pinkGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = pinkGlow;
  ctx.fillRect(0, 0, width, height);

  // 3. Vector Backdrop Lines (Large 'W' styled geometric motif)
  ctx.save();
  ctx.lineWidth = 24;
  ctx.strokeStyle = 'rgba(255, 105, 180, 0.15)';
  ctx.beginPath();
  ctx.moveTo(100, 40);
  ctx.lineTo(260, 380);
  ctx.lineTo(400, 140);
  ctx.lineTo(540, 380);
  ctx.lineTo(700, 40);
  ctx.stroke();

  ctx.lineWidth = 14;
  ctx.strokeStyle = 'rgba(0, 191, 255, 0.2)';
  ctx.beginPath();
  ctx.moveTo(140, 40);
  ctx.lineTo(280, 360);
  ctx.lineTo(400, 170);
  ctx.lineTo(520, 360);
  ctx.lineTo(660, 40);
  ctx.stroke();
  ctx.restore();

  // Helper to draw framed avatar box
  async function drawUserAvatarFrame(user, boxX, boxY, boxSize, nameLabel) {
    // Neon Frame Box
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#FF69B4';
    ctx.strokeRect(boxX, boxY, boxSize, boxSize);

    // Inner subtle glow
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 182, 193, 0.6)';
    ctx.strokeRect(boxX + 3, boxY + 3, boxSize - 6, boxSize - 6);

    // Avatar Image
    try {
      const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256 });
      const img = await loadImage(avatarUrl);
      ctx.drawImage(img, boxX + 6, boxY + 6, boxSize - 12, boxSize - 12);
    } catch (err) {
      // Fallback if avatar fetch fails
      ctx.fillStyle = '#2D0036';
      ctx.fillRect(boxX + 6, boxY + 6, boxSize - 12, boxSize - 12);
      ctx.fillStyle = '#FF69B4';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((user.username || 'U')[0].toUpperCase(), boxX + boxSize / 2, boxY + boxSize / 2);
    }

    // Username Label Tag
    const tagHeight = 40;
    const tagY = boxY + boxSize + 12;

    ctx.fillStyle = 'rgba(25, 0, 38, 0.85)';
    ctx.strokeStyle = '#FF69B4';
    ctx.lineWidth = 2;

    ctx.fillRect(boxX - 10, tagY, boxSize + 20, tagHeight);
    ctx.strokeRect(boxX - 10, tagY, boxSize + 20, tagHeight);

    ctx.fillStyle = '#FFB6C1';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Truncate long username if needed
    let nameText = nameLabel || user.username || 'User';
    if (nameText.length > 16) nameText = nameText.slice(0, 14) + '...';
    ctx.fillText(nameText, boxX + boxSize / 2, tagY + tagHeight / 2);
  }

  // Draw User 1 (Left: X=120, Y=80, Size=220)
  await drawUserAvatarFrame(user1, 120, 80, 220, user1.username);

  // Draw User 2 (Right: X=460, Y=80, Size=220)
  await drawUserAvatarFrame(user2, 460, 80, 220, user2.username);

  // 4. Center Glowing Pink Heart & Percentage Score
  const heartCenterX = 400;
  const heartCenterY = 190;
  const heartWidth = 110;
  const heartHeight = 100;

  // Heart Shadow/Glow
  ctx.save();
  ctx.shadowColor = '#FF1493';
  ctx.shadowBlur = 20;
  drawHeart(ctx, heartCenterX, heartCenterY - 45, heartWidth, heartHeight, '#FF69B4');
  ctx.restore();

  // Percentage Text inside Heart
  ctx.fillStyle = '#2B0014';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${score.toFixed(1)}%`, heartCenterX, heartCenterY + 5);

  return canvas.toBuffer('image/png');
}

export const execute = async (interaction) => {
  await interaction.deferReply().catch(() => {});

  try {
    const rawUser1 = interaction.options.getUser('user1');
    let rawUser2 = interaction.options.getUser('user2');

    // Default user2 if missing or if user1 === interaction.user
    if (!rawUser2) {
      if (rawUser1.id === interaction.user.id) {
        rawUser2 = interaction.client.user; // Compare with Riya!
      } else {
        rawUser2 = interaction.user; // Compare user1 with author
      }
    }

    const user1 = rawUser1;
    const user2 = rawUser2;

    // Calculate score percentage (e.g. 62.9%)
    const calculateScore = () => {
      const val = Math.floor(Math.random() * 1000) / 10;
      return Math.max(1.0, Math.min(100.0, val));
    };

    let score = calculateScore();

    const getHeaderMsg = (sc, u1, u2) => {
      if (sc < 35) return `Arey thodi mushkil lagti hai <@${u1.id}>, keep trying <@${u2.id}>! 💔`;
      if (sc < 65) return `There's hope <@${u1.id}>, keep trying <@${u2.id}>! 💕`;
      if (sc < 90) return `Ooooo <@${u1.id}> x <@${u2.id}> look so cute together! 💖`;
      return `MATCH MADE IN HEAVEN! 💘 <@${u1.id}> and <@${u2.id}> are true soulmates!`;
    };

    let imageBuffer = await renderShipCanvas(user1, user2, score);
    let attachment = new AttachmentBuilder(imageBuffer, { name: 'ship-card.png' });

    const pairBtn = new ButtonBuilder()
      .setCustomId(`ship_pair_${user1.id}_${user2.id}`)
      .setLabel('🌸 Pair')
      .setStyle(ButtonStyle.Success);

    const rerollBtn = new ButtonBuilder()
      .setCustomId(`ship_reroll_${user1.id}_${user2.id}`)
      .setLabel('🔄 Re-Roll')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(pairBtn, rerollBtn);

    const initialMsg = await interaction.editReply({
      content: getHeaderMsg(score, user1, user2),
      files: [attachment],
      components: [row]
    });

    const collector = initialMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120000
    });

    collector.on('collect', async i => {
      if (i.customId.startsWith('ship_reroll')) {
        score = calculateScore();
        imageBuffer = await renderShipCanvas(user1, user2, score);
        attachment = new AttachmentBuilder(imageBuffer, { name: 'ship-card.png' });

        await i.update({
          content: getHeaderMsg(score, user1, user2),
          files: [attachment],
          components: [row]
        });
        return;
      }

      if (i.customId.startsWith('ship_pair')) {
        // Target is user2 (or user1 if user2 clicked)
        const partnerTarget = (user2.id === interaction.client.user.id) ? user1 : user2;

        const untilTimestamp = Math.floor((Date.now() + 86400000) / 1000); // 24 hours unix timestamp

        const proposalContent = `🌸 Ooooo <@${partnerTarget.id}>, <@${i.user.id}> wants you to be their darling, just like Riya and Hiro! You'll be together until <t:${untilTimestamp}:F> (<t:${untilTimestamp}:R>) and do **+${score.toFixed(1)}% more damage** to Klaxosaurs & RPG Monsters! 💕`;

        const yesBtn = new ButtonBuilder()
          .setCustomId('ship_accept')
          .setLabel('💖 Yes, darling')
          .setStyle(ButtonStyle.Success);

        const noBtn = new ButtonBuilder()
          .setCustomId('ship_decline')
          .setLabel('💔 Ew, no')
          .setStyle(ButtonStyle.Danger);

        const proposalRow = new ActionRowBuilder().addComponents(yesBtn, noBtn);

        const proposalMsg = await i.update({
          content: proposalContent,
          components: [proposalRow]
        });

        const proposalCollector = proposalMsg.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 60000
        });

        proposalCollector.on('collect', async pInt => {
          if (pInt.user.id !== partnerTarget.id && pInt.user.id !== i.user.id && partnerTarget.id !== interaction.client.user.id) {
            return pInt.reply({ content: `❌ Only <@${partnerTarget.id}> can respond to this pairing request!`, ephemeral: true });
          }

          if (pInt.customId === 'ship_accept') {
            try {
              const uDoc1 = await getUserData(user1.id, interaction.guildId);
              const uDoc2 = await getUserData(user2.id, interaction.guildId);

              uDoc1.partnerId = user2.id;
              uDoc1.partnerUntil = Date.now() + 86400000;
              uDoc1.partnerBonus = score;

              uDoc2.partnerId = user1.id;
              uDoc2.partnerUntil = Date.now() + 86400000;
              uDoc2.partnerBonus = score;

              await saveUserData(uDoc1);
              await saveUserData(uDoc2);
            } catch (dbErr) {
              logger.error('Error saving partnership in database:', dbErr);
            }

            await pInt.update({
              content: `🎉 **PAIRED SUCCESSFULLY!** <@${user1.id}> & <@${user2.id}> are now official Darlings for the next 24 hours! Enjoy your **+${score.toFixed(1)}% Bonus XP & Battle Damage**! 💖✨`,
              components: []
            });
          } else if (pInt.customId === 'ship_decline') {
            await pInt.update({
              content: `💔 **REJECTED!** <@${pInt.user.id}> turned down the darling proposal. Better luck next time, baka! 🥺`,
              components: []
            });
          }
        });
      }
    });

  } catch (error) {
    logger.error('Error executing /ship command:', error);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: '❌ Failed to calculate ship compatibility graphic.' }).catch(() => {});
    } else {
      await interaction.reply({ content: '❌ Failed to calculate ship compatibility graphic.', ephemeral: true }).catch(() => {});
    }
  }
};
