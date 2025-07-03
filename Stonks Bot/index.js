// This loads your secret variables from a .env file
require("dotenv").config();

// --- STEP 1: IMPORT LIBRARIES ---
const { Client, GatewayIntentBits, ChannelType } = require("discord.js"); // Import ChannelType
const axios = require("axios");

// --- STEP 2: GET YOUR SECRETS ---
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

// --- STEP 3: CREATE THE BOT CLIENT ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, // Required for guild-related info (name, members)
    GatewayIntentBits.GuildMessages, // Required for messages in guilds
    GatewayIntentBits.MessageContent, // Required to read message content
    GatewayIntentBits.DirectMessages // CRITICAL: Required to receive messages in DMs
  ],
});

// --- STEP 4: SET UP EVENT LISTENERS ---

// This event runs once when the bot successfully logs in
client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}! Bot is online.`);
});

// This event runs for every message the bot can see
client.on("messageCreate", async (message) => {
  if (message.author.bot) return; // Always ignore bots from other bots

  let triggerType = null;
  let fullContent = message.content; // The user's message text

  // --- Determine if it's a Direct Message or a Guild Message ---
  if (message.channel.type === ChannelType.DM) {
    // This is a Direct Message to the bot
    triggerType = "dm";
    // For DMs, the content is typically pure user text, no mention cleaning needed.
    // All DMs should trigger a response.
  } else {
    // This is a message in a Guild (server) channel
    const isMention = message.mentions.has(client.user.id);
    const isReplyToMe =
      message.reference &&
      (await message.channel.messages
        .fetch(message.reference.messageId)
        .then((repliedToMsg) => repliedToMsg.author.id === client.user.id)
        .catch(() => false)); // Handle cases where the replied-to message is deleted

    if (isMention) {
      triggerType = "mention";
      // Clean the mention tag out of the content for guild messages
      fullContent = message.content.replace(/<@!?\d+>/g, "").trim();
    } else if (isReplyToMe) {
      triggerType = "reply";
      // Content is clean if it's a reply
    } else {
      // If it's a guild message AND not a mention AND not a reply, then ignore it.
      // This prevents the bot from responding to every message in a public channel.
      return; 
    }
  }

  // If there's no text content after the trigger (e.g., just a mention tag), do nothing
  if (!fullContent) return;

  // --- Initialize variables with null/default values, then populate based on message type ---
  let guildId = null;
  let guildName = null;
  // Prioritize guild nickname, then global_name, then username
  let userNickname = message.author.global_name || message.author.username; 

  // --- Populate guild-specific data if the message is from a guild ---
  if (message.guild) { // Check if message originated in a guild (not a DM)
    guildId = message.guild.id;
    guildName = message.guild.name; // Correct property for guild name

    if (message.member) { // message.member is only available for guild messages
        userNickname = message.member.nickname || userNickname; // Prefer guild nickname if it exists
    }
  }

  const channelId = message.channel.id;
  const channelName = message.channel.name; // Correct property for channel name (works for DMs and guilds)

  // Construct the payload to send to n8n
  const payload = {
    triggerType: triggerType, // Will be 'dm', 'mention', or 'reply'
    rawContent: fullContent,
    messageId: message.id,
    channelId: channelId,
    channelName: channelName,
    guildId: guildId,      // Will be null if it's a DM
    guildName: guildName,  // Will be null if it's a DM
    userId: message.author.id,
    userTag: message.author.tag, // Format: "username#discriminator" (legacy) or just "username"
    userNickname: userNickname,  // Guild nickname, global name, or username
    // Robust sessionId: for DMs, it will be 'discord-guild-DM-channel-<channelId>'
    sessionId: `discord-guild-${guildId || 'DM'}-channel-${channelId}`, 
  };

  console.log(
    `Received trigger '${payload.triggerType}' from ${payload.userTag}. Content: "${payload.rawContent}"`
  );

  try {
    axios
      .post(N8N_WEBHOOK_URL, payload)
      .then((response) => {
        console.log("Successfully sent data to n8n.");
        message.react("👀");
      })
      .catch((axiosError) => {
        console.error("Error sending data to n8n:", axiosError.message);
        message.react("❌");
      });
  } catch (criticalError) {
    console.error("A critical error occurred:", criticalError);
  }
});

// --- STEP 5: LOG THE BOT IN ---
client.login(DISCORD_TOKEN);