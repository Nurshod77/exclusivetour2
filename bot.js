require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, {
  polling: {
    interval: 300,
    autoStart: true,
    params: {
      timeout: 10
    }
  }
});

const ADMIN_ID = process.env.ADMIN_CHAT_ID || '7405854373';

const MESSAGES = {
  welcome: (firstName) => `Salom, ${firstName}! 👋\nBu ExclusiveTour.uz rasmiy botidir. Quyidagilardan birini tanlang:`,
  directions: `✈️ Hozirgi yo'nalishlar:\n\n• Umra Ziyorati\n• Turkiya Turi\n• Dubayga Sayohat\n• Malayziya Turi`,
  videos: `🎬 Quyidagi videolarimizni ko'ring:`,
  services: `🧳 Bizning xizmatlar:\n\n✅ Vizalar rasmiylashtirish\n✅ Aviabiletlar bron qilish\n✅ Mehmonxona joylash\n✅ Transfer va gid xizmati`,
  contact: `📞 Biz bilan bog'lanish:\n\n📍 Manzil: Toshkent, Yunusobod\n📱 Tel: +998 93 562 21 61\n🌐 Web: https://exclusivetour.uz`,
  adminPanel: `👨‍💼 Admin panel:\n\n📊 /stats - Statistikalar\n📢 /broadcast <xabar> - Barcha foydalanuvchilarga xabar\n👥 /users - Foydalanuvchilar ro'yxati`,
  accessDenied: `❌ Bu buyruq faqat admin uchun!`,
  unknownMessage: `Iltimos, menyudan tanlang:`,
  errorMessage: `Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.`
};

const KEYBOARDS = {
  main: {
    reply_markup: {
      keyboard: [
        ['🌍 Yonalishlar', '🎥 Video Lavhalar'],
        ['💼 Xizmatlar', '📞 Aloqa']
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    }
  },
  videos: {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Umra 2024", url: "https://t.me/exclusivetour_channel/1" }],
        [{ text: "Turkiya Vlog", url: "https://t.me/exclusivetour_channel/2" }],
        [{ text: "Dubai Tour", url: "https://t.me/exclusivetour_channel/3" }]
      ]
    }
  },
  admin: {
    reply_markup: {
      keyboard: [
        ['📊 Statistika', '📢 E\'lon yuborish'],
        ['👥 Foydalanuvchilar', '🔙 Asosiy menyu']
      ],
      resize_keyboard: true
    }
  }
};

const users = new Map();
const userStats = {
  totalUsers: 0,
  activeToday: 0,
  messagesCount: 0
};

const isAdmin = (userId) => userId.toString() === ADMIN_ID;

const saveUser = (user) => {
  const userId = user.id.toString();
  if (!users.has(userId)) {
    users.set(userId, {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name || '',
      username: user.username || '',
      joinDate: new Date(),
      lastActivity: new Date(),
      messageCount: 0
    });
    userStats.totalUsers++;
  } else {
    const existingUser = users.get(userId);
    existingUser.lastActivity = new Date();
    existingUser.messageCount++;
  }
  userStats.messagesCount++;
};

const getStats = () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  let activeToday = 0;
  users.forEach(user => {
    if (user.lastActivity >= today) {
      activeToday++;
    }
  });
  
  return {
    totalUsers: users.size,
    activeToday,
    messagesCount: userStats.messagesCount
  };
};

const messageHandlers = {
  '🌍 Yonalishlar': async (chatId, msg) => {
    await bot.sendMessage(chatId, MESSAGES.directions);
  },
  '🎥 Video Lavhalar': async (chatId, msg) => {
    await bot.sendMessage(chatId, MESSAGES.videos, KEYBOARDS.videos);
  },
  '💼 Xizmatlar': async (chatId, msg) => {
    await bot.sendMessage(chatId, MESSAGES.services);
  },
  '📞 Aloqa': async (chatId, msg) => {
    await bot.sendMessage(chatId, MESSAGES.contact);
  },
  '📊 Statistika': async (chatId, msg) => {
    if (!isAdmin(msg.from.id)) {
      await bot.sendMessage(chatId, MESSAGES.accessDenied);
      return;
    }
    const stats = getStats();
    const statsMessage = `📊 Bot Statistikasi:\n\n👥 Jami foydalanuvchilar: ${stats.totalUsers}\n🟢 Bugun faol: ${stats.activeToday}\n💬 Jami xabarlar: ${stats.messagesCount}\n📅 Sana: ${new Date().toLocaleDateString('uz-UZ')}`;
    await bot.sendMessage(chatId, statsMessage);
  },
  '👥 Foydalanuvchilar': async (chatId, msg) => {
    if (!isAdmin(msg.from.id)) {
      await bot.sendMessage(chatId, MESSAGES.accessDenied);
      return;
    }
    let usersList = '👥 Foydalanuvchilar ro\'yxati:\n\n';
    let count = 0;
    for (let user of users.values()) {
      if (count >= 20) break;
      usersList += `${count + 1}. ${user.firstName} ${user.lastName} (@${user.username || 'no_username'})\n`;
      count++;
    }
    if (users.size > 20) {
      usersList += `\n... va yana ${users.size - 20} ta foydalanuvchi`;
    }
    await bot.sendMessage(chatId, usersList);
  },
  '🔙 Asosiy menyu': async (chatId, msg) => {
    const firstName = msg.from.first_name || 'Foydalanuvchi';
    await bot.sendMessage(chatId, MESSAGES.welcome(firstName), KEYBOARDS.main);
  }
};

bot.onText(/\/start/, async (msg) => {
  try {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || 'Foydalanuvchi';
    await bot.sendMessage(chatId, MESSAGES.welcome(firstName), KEYBOARDS.main);
  } catch (error) {
    console.error('Start command error:', error);
  }
});

bot.onText(/\/admin/, async (msg) => {
  try {
    const chatId = msg.chat.id;
    if (!isAdmin(msg.from.id)) {
      await bot.sendMessage(chatId, MESSAGES.accessDenied);
      return;
    }
    await bot.sendMessage(chatId, MESSAGES.adminPanel, KEYBOARDS.admin);
  } catch (error) {
    console.error('Admin command error:', error);
  }
});

bot.onText(/\/stats/, async (msg) => {
  try {
    const chatId = msg.chat.id;
    if (!isAdmin(msg.from.id)) {
      await bot.sendMessage(chatId, MESSAGES.accessDenied);
      return;
    }
    const stats = getStats();
    const statsMessage = `📊 Batafsil Statistika:\n\n👥 Jami foydalanuvchilar: ${stats.totalUsers}\n🟢 Bugun faol: ${stats.activeToday}\n💬 Jami xabarlar: ${stats.messagesCount}\n⏰ Server vaqti: ${new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}\n🤖 Bot holati: Faol`;
    await bot.sendMessage(chatId, statsMessage);
  } catch (error) {
    console.error('Stats command error:', error);
  }
});

bot.onText(/\/broadcast (.+)/, async (msg, match) => {
  try {
    const chatId = msg.chat.id;
    if (!isAdmin(msg.from.id)) {
      await bot.sendMessage(chatId, MESSAGES.accessDenied);
      return;
    }
    const broadcastMessage = match[1];
    let successCount = 0;
    let errorCount = 0;
    await bot.sendMessage(chatId, '📢 Xabar yuborilmoqda...');
    for (let user of users.values()) {
      try {
        await bot.sendMessage(user.id, `📢 E'lon:\n\n${broadcastMessage}`);
        successCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        errorCount++;
        console.error(`Failed to send to user ${user.id}:`, error);
      }
    }
    await bot.sendMessage(chatId, `✅ Xabar yuborish yakunlandi:\n📤 Muvaffaqiyatli: ${successCount}\n❌ Xatolik: ${errorCount}`);
  } catch (error) {
    console.error('Broadcast command error:', error);
  }
});

bot.on('message', async (msg) => {
  try {
    if (msg.text?.startsWith('/')) return;
    const chatId = msg.chat.id;
    const messageText = msg.text;
    saveUser(msg.from);
    const handler = messageHandlers[messageText];
    if (handler) {
      await handler(chatId, msg);
    } else if (messageText && !messageText.startsWith('/')) {
      await bot.sendMessage(chatId, MESSAGES.unknownMessage, KEYBOARDS.main);
    }
  } catch (error) {
    console.error('Message handler error:', error);
    try {
      await bot.sendMessage(msg.chat.id, MESSAGES.errorMessage);
    } catch (sendError) {
      console.error('Error sending error message:', sendError);
    }
  }
});

bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

process.on('SIGINT', async () => {
  console.log('Bot is shutting down...');
  bot.stopPolling();
  process.exit(0);
});

console.log('🚀 ExclusiveTour bot is running...');
console.log(`👨‍💼 Admin ID: ${ADMIN_ID}`);
console.log(`⏰ Started at: ${new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}`);