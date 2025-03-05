const { bot } = require('../../lib/index.js');
const DebugServer = require('../../web/server.js');
const config = require('../../lib/config');
const registerScenes = require('./src/scenes');
const registerCommands = require('./src/commands');

// Инициализация и запуск
(async () => {
    try {
        // Инициализируем бота с подключением к БД
        await bot.init({
            dbUri: config.database.uri
        });

        // Очищаем состояния пользователей при запуске
        console.log('Очистка состояний...');
        await bot.clearCollection('user_states');

        // Регистрируем сцены и команды
        registerScenes(bot);
        registerCommands(bot);

        // Запускаем отладочный веб-интерфейс если он включен
        if (config.webInterface.enabled) {
            const debugServer = new DebugServer();
            await debugServer.start();
            console.log(`Отладочный веб-интерфейс доступен на http://localhost:${config.webInterface.port}`);
        }

        // Запускаем бота
        await bot.start();
        console.log('Бот запущен и готов к работе!');
    } catch (error) {
        console.error('Ошибка при запуске бота:', error);
        process.exit(1);
    }
})();
