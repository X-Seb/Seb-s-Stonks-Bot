// This loads your secret variables from a .env file
require("dotenv").config();

// --- STEP 1: IMPORT LIBRARIES ---
const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");

// --- STEP 2: GET YOUR SECRETS ---
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const COMMAND_PREFIX = "s!";

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
  // (This is the full message handling logic from our previous conversations)
  if (message.author.bot) return;

  let triggerType = null;
  let fullContent = "";

  if (message.content.startsWith(COMMAND_PREFIX)) {
    triggerType = "prefix";
    fullContent = message.content.slice(COMMAND_PREFIX.length).trim();
  } else if (message.mentions.has(client.user.id)) {
    triggerType = "mention";
    fullContent = message.content.replace(/<@.?[0-9]*?>/g, "").trim();
  } else {
    return;
  }

  if (!fullContent) return;

  const payload = {
    triggerType: triggerType,
    rawContent: fullContent,
    messageId: message.id,
    channelId: message.channel.id,
    guildId: message.guild.id,
    userId: message.author.id,
    userTag: message.author.tag,
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
