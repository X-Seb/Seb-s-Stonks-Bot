// This loads your secret variables from a .env file
require("dotenv").config();

// Import the necessary libraries
const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");

// Your bot's secret token and n8n webhook URL from the .env file
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const COMMAND_PREFIX = "s!";

// Create a new bot instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// When the bot is logged in and ready
client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}! Bot is online.`);
});

// This event fires for every new message
client.on("messageCreate", async (message) => {
  // Ignore messages from other bots or those not starting with the prefix
  if (message.author.bot || !message.content.startsWith(COMMAND_PREFIX)) {
    return;
  }

  // --- NEW: Universal Command and Content Parsing ---
  const fullContent = message.content.slice(COMMAND_PREFIX.length).trim();
  const command = fullContent.split(/ +/)[0].toLowerCase();
  const content = fullContent.slice(command.length).trim();
  // --- END NEW ---

  // If there's no command, do nothing.
  if (!command) return;

  console.log(`Command: "${command}", Content: "${content}"`);
  console.log(`ChannelId: ${message.id}, User: ${message.author.tag}`);

  // Prepare the data payload to send to n8n
  const payload = {
    command: command,
    content: content,
    messageId: message.id, // <-- The ID of the triggering message
    channelId: message.channel.id, // The channel to reply in
    guildId: message.guild.id, // The server the command was run in
    userId: message.author.id, // The permanent ID of the user
    userTag: message.author.tag, // The human-readable user name
    timestamp: message.createdAt, // The time the message was sent
  };

  try {
    // Send the payload to the n8n webhook
    // Fixed: Now properly awaiting the axios call
    await axios.post(N8N_WEBHOOK_URL, payload);
  } catch (error) {
    console.error("Error sending data to n8n:", error.message);
    message.reply("Oops! There was an error connecting.");
    message.react("❌");
  }
});

// Log the bot in
client.login(DISCORD_TOKEN);
