const TelegramBot = require('node-telegram-bot-api');
const config = require('../config');
let bot;

async function sendTelegramAlert(payload) {
  const chatId = payload.chatId || config.TELEGRAM_CHAT_ID;
  if (!config.TELEGRAM_BOT_TOKEN || !chatId) throw new Error('Telegram alert configuration is incomplete');
  bot ||= new TelegramBot(config.TELEGRAM_BOT_TOKEN);
  await bot.sendMessage(chatId, `[${payload.type}] HazardGuard: ${payload.sensor} ${payload.value} - ${payload.message}`);
}

module.exports = { sendTelegramAlert };
