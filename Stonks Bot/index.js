// This loads your secret variables from a .env file
require("dotenv").config();

// --- STEP 1: IMPORT LIBRARIES ---
const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");

// --- STEP 2: GET YOUR SECRETS ---
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
// The COMMAND_PREFIX is no longer needed.

// --- STEP 3: CREATE THE BOT CLIENT ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// --- STEP 4: SET UP EVENT LISTENERS ---

// This event runs once when the bot successfully logs in
client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}! Bot is online.`);
});

// This event runs for every message the bot can see
client.on("messageCreate", async (message) => {
  if (message.author.bot) return; // Always ignore bots

  let triggerType = null;
  let fullContent = message.content; // The user's message text

  const isMention = message.mentions.has(client.user.id);
  const isReplyToMe =
    message.reference &&
    (await message.channel.messages
      .fetch(message.reference.messageId)
      .then((repliedToMsg) => repliedToMsg.author.id === client.user.id)
      .catch(() => false)); // Handle cases where the replied-to message is deleted

  // --- NEW: Check for Mention or Reply-to-Bot ---
  if (isMention) {
    triggerType = "mention";
    // Clean the mention tag out of the content
    fullContent = message.content.replace(/<@!?\d+>/g, "").trim();
  } else if (isReplyToMe) {
    triggerType = "reply";
    // The content is already clean, no changes needed
  } else {
    // If it's not a mention or a reply to our bot, ignore it.
    return;
  }

  // If there's no text content after the trigger, do nothing
  if (!fullContent) return;

  const payload = {
    triggerType: triggerType, // Will be 'mention' or 'reply'
    rawContent: fullContent,
    messageId: message.id,
    channelId: message.channel.id,
    guildId: message.guild.id,
    userId: message.author.id,
    userTag: message.author.tag,
    userNickname: message.author.userNickname,
    sessionId: `discord-guild-${message.guild.id}-channel-${message.channel.id}`,
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
