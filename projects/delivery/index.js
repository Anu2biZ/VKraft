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

        // Очищаем коллекции и добавляем тестовые данные
        const data = require('./data/pizzas.js');
        
        console.log('Очистка коллекций...');
        await bot.clearCollection('categories');
        await bot.clearCollection('pizzas');
        await bot.clearCollection('cart');
        await bot.clearCollection('user_states');

        console.log('Добавление категорий...');
        for (const category of data.categories) {
            await bot.addDocument('categories', category);
            console.log(`✓ Добавлена категория: ${category.name}`);
        }

        console.log('Добавление пицц...');
        for (const pizza of data.pizzas) {
            await bot.addDocument('pizzas', pizza);
            console.log(`✓ Добавлена пицца: ${pizza.name}`);
        }

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
