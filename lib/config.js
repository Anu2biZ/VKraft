require('dotenv').config();

const config = {
    // Режим работы: 'production' или 'development'
    mode: process.env.NODE_ENV || 'development',

    // Настройки VK
    vk: {
        token: process.env.VK_TOKEN,
        groupId: process.env.VK_GROUP_ID
    },

    // Настройки базы данных
    database: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/vkbot'
    },

    // Настройки веб-интерфейса
    webInterface: {
        enabled: process.env.WEB_INTERFACE_ENABLED === 'true',
        port: parseInt(process.env.WEB_INTERFACE_PORT) || 3001
    }
};

module.exports = config;
