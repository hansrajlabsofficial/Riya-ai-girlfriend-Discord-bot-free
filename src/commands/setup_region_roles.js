import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { REGIONS_CONFIG, buildRegionPanel, DEFAULT_REGION_DESCRIPTION } from '../services/regionRoleService.js';
import { findExistingGuildRole } from '../utils/roleMatcher.js';
import { getGuildConfig, saveGuildConfig } from '../database/models/GuildConfig.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('setup_region_roles')
  .setDescription('Deploy interactive Region Selection auto-roles panel with buttons and world map')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .addStringOption(opt =>
    opt.setName('raw_json')
      .setDescription('Paste raw JSON code to automatically configure and deploy all region roles')
      .setRequired(false)
  )
  .addChannelOption(opt =>
    opt.setName('channel')
      .setDescription('Channel where the region selection panel will be posted (defaults to current channel)')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false)
  )
  .addBooleanOption(opt =>
    opt.setName('auto_create_roles')
      .setDescription('Auto-create missing region roles ONLY if not found in server (Default: False)')
      .setRequired(false)
  )
  .addRoleOption(opt =>
    opt.setName('north_america_role')
      .setDescription('Role to assign for North America (optional)')
      .setRequired(false)
  )
  .addRoleOption(opt =>
    opt.setName('south_america_role')
      .setDescription('Role to assign for South America (optional)')
      .setRequired(false)
  )
  .addRoleOption(opt =>
    opt.setName('east_europe_role')
      .setDescription('Role to assign for East Europe (optional)')
      .setRequired(false)
  )
  .addRoleOption(opt =>
    opt.setName('west_europe_role')
      .setDescription('Role to assign for West Europe (optional)')
      .setRequired(false)
  )
  .addRoleOption(opt =>
    opt.setName('oceania_role')
      .setDescription('Role to assign for Oceania (optional)')
      .setRequired(false)
  )
  .addRoleOption(opt =>
    opt.setName('asia_role')
      .setDescription('Role to assign for Asia (optional)')
      .setRequired(false)
  )
  .addRoleOption(opt =>
    opt.setName('africa_role')
      .setDescription('Role to assign for Africa (optional)')
      .setRequired(false)
  )
  .addRoleOption(opt =>
    opt.setName('rather_not_say_role')
      .setDescription('Role to assign for Rather not say (optional)')
      .setRequired(false)
  )
  .addStringOption(opt =>
    opt.setName('map_image_url')
      .setDescription('Custom world map image URL (optional, defaults to built-in region map)')
      .setRequired(false)
  )
  .addStringOption(opt =>
    opt.setName('custom_title')
      .setDescription('Custom title for the embed (Default: Region Selection)')
      .setRequired(false)
  )
  .addStringOption(opt =>
    opt.setName('custom_description')
      .setDescription('Custom description text for the embed (optional)')
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
      content: '❌ **Manage Roles Permission Required!** Only administrators or server staff with Manage Roles can configure the Region Selection auto-roles.',
      ephemeral: true
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  let targetChannel = interaction.options.getChannel('channel') || interaction.channel;
  let autoCreate = interaction.options.getBoolean('auto_create_roles') ?? false;
  let mapImageUrl = interaction.options.getString('map_image_url');
  let customTitle = interaction.options.getString('custom_title') || 'Region Selection';
  let customDescription = interaction.options.getString('custom_description') || DEFAULT_REGION_DESCRIPTION;

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
      if (parsed.map_image_url || parsed.mapImageUrl || parsed.banner_url) {
        mapImageUrl = parsed.map_image_url || parsed.mapImageUrl || parsed.banner_url;
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

      rawJsonRoles = parsed.roles || parsed.regionRoles || parsed;
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

  // Check Manage Roles
  if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return await interaction.editReply({
      content: '❌ **Manage Roles Error:** I require the **Manage Roles** bot permission so that I can create and assign region roles to members.'
    });
  }

  // 3. Resolve Roles for Each Region
  const regionRolesMap = {};
  const createdRoles = [];
  const existingRoles = [];

  // Ensure all server roles are fully fetched before matching
  await guild.roles.fetch().catch(() => {});

  for (const reg of REGIONS_CONFIG) {
    const optionName = `${reg.key}_role`;
    const roleOption = interaction.options.getRole(optionName);
    const jsonVal = rawJsonRoles ? (rawJsonRoles[reg.key] || rawJsonRoles[reg.name] || rawJsonRoles[`${reg.key}_role`]) : null;
    const explicitVal = roleOption ? roleOption.id : jsonVal;

    // 1. Thoroughly search for existing server role first!
    let role = await findExistingGuildRole(guild, reg, explicitVal);

    // 2. Only create a new role if NOT found and autoCreate is explicitly true
    if (!role && autoCreate) {
      try {
        role = await guild.roles.create({
          name: reg.name,
          color: reg.defaultColor,
          reason: `Riya Auto-Roles: Auto-created missing ${reg.name} continent role`
        });
        createdRoles.push(role);
      } catch (err) {
        logger.error(`Failed to auto-create role ${reg.name}:`, err);
      }
    } else if (role) {
      existingRoles.push(role);
    }

    if (role) {
      regionRolesMap[reg.key] = role.id;
    }
  }

  // 4. Save to Database (GuildConfig)
  try {
    const guildConfig = await getGuildConfig(guild.id);
    guildConfig.regionRoles = regionRolesMap;
    await saveGuildConfig(guildConfig);
  } catch (err) {
    logger.warn(`Could not save regionRoles to database: ${err.message}`);
  }

  // 5. Build and Send the Panel to the Target Channel
  try {
    const panelData = buildRegionPanel({
      title: customTitle,
      description: customDescription,
      mapImageUrl,
      regionRolesMap
    });

    let panelMessage;
    try {
      panelMessage = await targetChannel.send(panelData);
    } catch (sendErr) {
      if (
        sendErr.message?.includes('COMPONENT_INVALID_EMOJI') ||
        sendErr.rawError?.message?.includes('Invalid emoji') ||
        sendErr.code === 50035
      ) {
        logger.warn('Failed sending panel with emojis, automatically retrying without button emojis...');
        panelData.components.forEach(row => {
          row.components.forEach(btn => {
            btn.data.emoji = undefined;
          });
        });
        panelMessage = await targetChannel.send(panelData);
      } else {
        throw sendErr;
      }
    }

    // 6. Respond to Admin
    let statusText = `🎉 **Region Selection Panel successfully deployed to <#${targetChannel.id}>!**\n[Jump to Panel Message](${panelMessage.url})\n\n`;
    statusText += `**Configured Continent Roles:**\n`;
    
    for (const reg of REGIONS_CONFIG) {
      const roleId = regionRolesMap[reg.key];
      const isNew = createdRoles.some(r => r.id === roleId);
      if (roleId) {
        statusText += `• ${reg.emoji} **${reg.name}**: <@&${roleId}> ${isNew ? '*(New Role Created)*' : '*(Existing Role Linked)*'}\n`;
      } else {
        statusText += `• ${reg.emoji} **${reg.name}**: ⚠️ *(Not found in server - use \`auto_create_roles: True\` if you want Riya to create it)*\n`;
      }
    }

    if (createdRoles.length > 0) {
      statusText += `\n✨ *Auto-created ${createdRoles.length} new role(s) with matching colors!*`;
    } else if (existingRoles.length > 0) {
      statusText += `\n🔒 *Reused ${existingRoles.length} existing server role(s) without creating duplicates!*`;
    }

    statusText += `\n\n💡 **Tip:** Ensure the bot's highest role is positioned **above** these region roles in **Server Settings > Roles** so the bot can assign them!`;

    const summaryEmbed = new EmbedBuilder()
      .setColor('#00FF7F')
      .setTitle('🌍 Region Selection Auto-Roles Ready!')
      .setDescription(statusText)
      .setFooter({ text: 'AHP Group Pvt. Ltd. • Riya Auto-Roles System 💖' });

    return await interaction.editReply({ embeds: [summaryEmbed] });
  } catch (err) {
    logger.error('Error deploying region selection panel:', err);
    return await interaction.editReply({
      content: `❌ **Failed to send panel:** ${err.message}`
    });
  }
};
