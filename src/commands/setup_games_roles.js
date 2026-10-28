import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { TEMPLATES, buildGameRolesPanel, resolveButtonEmoji } from '../services/gameRoleService.js';
import { findExistingGuildRole } from '../utils/roleMatcher.js';
import { getGuildConfig, saveGuildConfig } from '../database/models/GuildConfig.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('setup_games_roles')
  .setDescription('Deploy interactive Self Game Roles panel with buttons, emojis, and templates')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .addStringOption(opt =>
    opt.setName('raw_json')
      .setDescription('Paste raw JSON code to automatically configure and deploy all game roles')
      .setRequired(false)
  )
  .addStringOption(opt =>
    opt.setName('template')
      .setDescription('Choose a preset template or custom setup')
      .setRequired(false)
      .addChoices(
        { name: '⚡ VIP ARMY (Games & Pings - Dual Panel)', value: 'vip_army' },
        { name: '🎮 HANSRAJ Top 17 Games (Bloodstrike, FreeFire, Minecraft, GTA5...)', value: 'hansraj_games' },
        { name: '🧪 GameTester & Devices (Game Nights, Competitions, PC/Console...)', value: 'gametester' }
      )
  )
  .addChannelOption(opt =>
    opt.setName('channel')
      .setDescription('Channel where the game roles panel will be sent (defaults to current channel)')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false)
  )
  .addBooleanOption(opt =>
    opt.setName('auto_create_roles')
      .setDescription('Auto-create missing game roles ONLY if not found in server (Default: False)')
      .setRequired(false)
  )
  .addRoleOption(opt =>
    opt.setName('custom_role')
      .setDescription('Select a specific role if adding a custom single game role')
      .setRequired(false)
  )
  .addStringOption(opt =>
    opt.setName('custom_emoji')
      .setDescription('Emoji for custom role button (e.g. 🎮, ⛏️, or server emoji name)')
      .setRequired(false)
  )
  .addStringOption(opt =>
    opt.setName('custom_title')
      .setDescription('Custom title for the embed')
      .setRequired(false)
  )
  .addStringOption(opt =>
    opt.setName('custom_description')
      .setDescription('Custom description text for the embed')
      .setRequired(false)
  );

export const execute = async (interaction) => {
  // 1. Permission Check
  if (
    interaction.member?.permissions &&
    !interaction.member.permissions.has(PermissionFlagsBits.Administrator) &&
    !interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)
  ) {
    return await interaction.reply({
      content: '❌ **Manage Roles Permission Required!** Only administrators or server staff with Manage Roles can deploy or configure the Game Roles panel.',
      ephemeral: true
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  let targetChannel = interaction.options.getChannel('channel') || interaction.channel;
  let templateKey = interaction.options.getString('template') || 'hansraj_games';
  let autoCreate = interaction.options.getBoolean('auto_create_roles') ?? false;
  const customRole = interaction.options.getRole('custom_role');
  const customEmojiInput = interaction.options.getString('custom_emoji');
  let customTitle = interaction.options.getString('custom_title');
  let customDescription = interaction.options.getString('custom_description');

  // Process Raw JSON Input if provided
  const rawJsonInput = interaction.options.getString('raw_json');
  let rawJsonRoles = null;
  if (rawJsonInput) {
    try {
      const cleaned = rawJsonInput.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      const parsed = JSON.parse(cleaned);

      if (parsed.channel_id || parsed.channelId || parsed.channel) {
        const cId = String(parsed.channel_id || parsed.channelId || parsed.channel).replace(/[<#>]/g, '').trim();
        const foundCh = guild.channels.cache.get(cId) || guild.channels.cache.find(c => c.name.toLowerCase() === cId.toLowerCase());
        if (foundCh && foundCh.isTextBased()) targetChannel = foundCh;
      }
      if (parsed.template && TEMPLATES[parsed.template]) {
        templateKey = parsed.template;
      }
      if (parsed.custom_title || parsed.title) {
        customTitle = parsed.custom_title || parsed.title;
      }
      if (parsed.custom_description || parsed.description) {
        customDescription = parsed.custom_description || parsed.description;
      }
      if (parsed.auto_create_roles !== undefined) {
        autoCreate = Boolean(parsed.auto_create_roles);
      }

      rawJsonRoles = parsed.roles || parsed.gameRoles || parsed;
    } catch (parseErr) {
      return await interaction.editReply({
        content: `❌ **Invalid Raw JSON Syntax:** Please check your JSON format!\n\`\`\`\n${parseErr.message}\n\`\`\``
      });
    }
  }

  // 2. Channel Permissions Check for Bot
  const botMember = guild.members.me || await guild.members.fetchMe().catch(() => null);
  const channelPerms = targetChannel.permissionsFor(botMember);

  if (!channelPerms || !channelPerms.has(PermissionFlagsBits.ViewChannel) || !channelPerms.has(PermissionFlagsBits.SendMessages) || !channelPerms.has(PermissionFlagsBits.EmbedLinks)) {
    return await interaction.editReply({
      content: `❌ **Channel Permission Error:** I need **View Channel**, **Send Messages**, and **Embed Links** permissions in <#${targetChannel.id}>.`
    });
  }

  // Check Manage Roles permission
  if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return await interaction.editReply({
      content: '❌ **Manage Roles Error:** I require the **Manage Roles** bot permission so that I can create and assign roles to server members.'
    });
  }

  // 3. Handle Single Custom Role Case (if custom_role option was passed)
  if (customRole) {
    try {
      const embed = new EmbedBuilder()
        .setColor('#F1C40F')
        .setTitle(customTitle || `🎮 Claim Role: ${customRole.name}`)
        .setDescription(customDescription || `Click the button below to claim or remove the **${customRole.name}** role!`)
        .setFooter({ text: 'AHP Group Pvt. Ltd. • Self Game Roles 💖' })
        .setTimestamp();

      const button = new ButtonBuilder()
        .setCustomId(`gamerole_toggle:custom:${customRole.id}:${customRole.id}`)
        .setLabel(customRole.name)
        .setStyle(ButtonStyle.Primary);

      if (customEmojiInput) {
        const emojiVal = resolveButtonEmoji(guild, customEmojiInput, customEmojiInput);
        if (emojiVal) {
          try { button.setEmoji(emojiVal); } catch (e) {}
        }
      }

      const row = new ActionRowBuilder().addComponents(button);
      const msg = await targetChannel.send({ embeds: [embed], components: [row] });

      return await interaction.editReply({
        content: `✅ **Custom Game Role Button deployed to <#${targetChannel.id}>!**\n[Jump to Message](${msg.url}) for role <@&${customRole.id}>.`
      });
    } catch (err) {
      logger.error('Failed deploying custom role button:', err);
      return await interaction.editReply({ content: `❌ Error deploying custom role button: ${err.message}` });
    }
  }

  // 4. Handle Template Deployment (HANSRAJ Games, VIP ARMY, or GameTester)
  const template = TEMPLATES[templateKey] || TEMPLATES.hansraj_games;
  const rolesMap = {};
  const createdRoles = [];
  const existingRoles = [];

  // Ensure all server roles are fully fetched before matching
  await guild.roles.fetch().catch(() => {});

  for (const item of template.items) {
    let role = null;

    const explicitVal = rawJsonRoles ? (rawJsonRoles[item.key] || rawJsonRoles[item.name] || (item.label && rawJsonRoles[item.label]) || rawJsonRoles[`${item.key}_role`]) : null;

    // 1. Thoroughly search for existing server role first!
    role = await findExistingGuildRole(guild, item, explicitVal);

    // 2. Only create a new role if NOT found and autoCreate is explicitly true
    if (!role && autoCreate) {
      try {
        role = await guild.roles.create({
          name: item.name,
          color: item.color,
          reason: `Riya Auto Game Roles: Auto-created missing ${item.name} role`
        });
        createdRoles.push(role);
      } catch (err) {
        logger.error(`Failed to auto-create role ${item.name}: ${err.message}`);
      }
    } else if (role) {
      existingRoles.push(role);
    }

    if (role) {
      rolesMap[item.key] = role.id;
    }
  }

  // Save to GuildConfig
  try {
    const guildConfig = await getGuildConfig(guild.id);
    guildConfig.gameRoles = { ...(guildConfig.gameRoles || {}), ...rolesMap };
    await saveGuildConfig(guildConfig);
  } catch (err) {
    logger.warn(`Could not save gameRoles to database: ${err.message}`);
  }

  // 5. Build Panel
  const panelData = buildGameRolesPanel({
    templateKey,
    customTitle,
    customDescription,
    guild,
    rolesMap
  });

  // 6. Send with Bulletproof Fallback
  let panelMessage;
  try {
    panelMessage = await targetChannel.send(panelData);
  } catch (sendErr) {
    if (
      sendErr.message?.includes('COMPONENT_INVALID_EMOJI') ||
      sendErr.rawError?.message?.includes('Invalid emoji') ||
      sendErr.code === 50035
    ) {
      logger.warn('Failed sending game roles panel with emojis, automatically retrying without button emojis...');
      panelData.components.forEach(row => {
        row.components.forEach(btn => {
          btn.data.emoji = undefined;
        });
      });
      panelMessage = await targetChannel.send(panelData);
    } else {
      logger.error('Error sending game roles panel:', sendErr);
      return await interaction.editReply({
        content: `❌ **Failed to send panel:** ${sendErr.message}`
      });
    }
  }

  // 7. Reply to Admin
  const templateTitle = templateKey === 'vip_army' ? '⚡ VIP ARMY Roles' : (templateKey === 'hansraj_games' ? '🎮 HANSRAJ Game Roles' : '🧪 GameTester Roles');
  let statusText = `🎉 **${templateTitle} Panel deployed to <#${targetChannel.id}>!**\n[Jump to Panel Message](${panelMessage.url})\n\n`;
  statusText += `**Configured Game Roles (${template.items.length}):**\n`;

  for (const item of template.items) {
    const roleId = rolesMap[item.key];
    const isNew = createdRoles.some(r => r.id === roleId);
    if (roleId) {
      statusText += `• ${item.defaultEmoji} **${item.name}**: <@&${roleId}> ${isNew ? '*(New Role Created)*' : '*(Existing Role Linked)*'}\n`;
    } else {
      statusText += `• ${item.defaultEmoji} **${item.name}**: ⚠️ *(Not found in server - use \`auto_create_roles: True\` if you want Riya to create it)*\n`;
    }
  }

  if (createdRoles.length > 0) {
    statusText += `\n✨ *Auto-created ${createdRoles.length} new role(s) with matching colors!*`;
  } else if (existingRoles.length > 0) {
    statusText += `\n🔒 *Reused ${existingRoles.length} existing server role(s) without creating duplicates!*`;
  }

  statusText += `\n\n💡 **Tip:** Ensure the bot's highest role is positioned **above** these roles in **Server Settings > Roles** so the bot can assign them!`;

  const summaryEmbed = new EmbedBuilder()
    .setColor('#00FF7F')
    .setTitle('🎮 Self Game Roles Setup Complete!')
    .setDescription(statusText)
    .setFooter({ text: 'AHP Group Pvt. Ltd. • Riya Auto-Roles System 💖' });

  return await interaction.editReply({ embeds: [summaryEmbed] });
};
