const { bot } = require('../lib/index.js');
const DebugServer = require('../web/server.js');
const config = require('../lib/config');

// Определяем команды
const COMMANDS = {
    HELLO: 'привет',
    HELP: 'помощь',
    IMAGE: 'картинка',
    BACK: 'назад',
    CONTACT: 'связаться с человеком',
    DB_TEST: 'тест бд'
};

// Регистрируем сцены
bot.scenes
    // Главная сцена
    .scene('main', {
        keyboard: {
            buttons: [
                [
                    { text: COMMANDS.HELLO, color: 'primary' },
                    { text: COMMANDS.HELP, color: 'secondary' },
                    { text: COMMANDS.IMAGE, color: 'positive' }
                ],
                [
                    { text: COMMANDS.DB_TEST, color: 'primary' }
                ]
            ]
        },
        async enter(ctx) {
            await bot.reply(ctx, 'Привет! Я эхо-бот. Напиши мне что-нибудь!');
        },
        async handle(ctx) {
            // Если не команда, отправляем эхо
            const messageText = ctx.message?.text || 'неизвестное сообщение';
            await bot.reply(ctx, `Вы написали: ${messageText}`);
        }
    })

    // Сцена помощи
    .scene('help', {
        keyboard: {
            buttons: [
                [
                    { text: COMMANDS.BACK, color: 'negative' }
                ],
                [
                    { text: COMMANDS.CONTACT, color: 'primary' }
                ]
            ]
        },
        async enter(ctx) {
            await bot.reply(ctx,
                'Доступные команды:\n' +
                `- ${COMMANDS.HELLO}: начать диалог\n` +
                `- ${COMMANDS.HELP}: показать это сообщение\n` +
                `- ${COMMANDS.IMAGE}: получить случайную картинку\n` +
                `- ${COMMANDS.DB_TEST}: тест работы с базой данных`
            );
        },
        async handle(ctx) {
            const text = ctx.message?.text?.toLowerCase();
            if (text === COMMANDS.CONTACT) {
                await bot.reply(ctx, 'Наш оператор свяжется с вами в ближайшее время.');
            }
        }
    });

// Регистрируем команды
bot.commands
    .command({
        name: COMMANDS.HELLO,
        handler: async (ctx) => {
            await bot.scenes.enter(ctx.peerId, 'main', ctx);
        }
    })
    .command({
        name: COMMANDS.HELP,
        handler: async (ctx) => {
            await bot.scenes.enter(ctx.peerId, 'help', ctx);
        }
    })
    .command({
        name: COMMANDS.IMAGE,
        handler: async (ctx) => {
            await bot.sendImg(ctx.peerId, 'https://picsum.photos/400/300');
        }
    })
    .command({
        name: COMMANDS.BACK,
        handler: async (ctx) => {
            await bot.scenes.enter(ctx.peerId, 'main', ctx);
        }
    })
    .command({
        name: COMMANDS.DB_TEST,
        handler: async (ctx) => {
            try {
                // Добавляем тестовую запись
                const testData = {
                    userId: ctx.peerId,
                    message: ctx.text,
                    timestamp: new Date(),
                    type: 'test'
                };

                await bot.addDocument('test_messages', testData);
                
                // Получаем все записи
                const allMessages = await bot.getAllDocuments('test_messages');
                
                await bot.reply(ctx, `Запись добавлена в БД!\nВсего записей: ${allMessages.length}`);
            } catch (error) {
                console.error('Ошибка при тестировании БД:', error);
                await bot.reply(ctx, 'Произошла ошибка при работе с базой данных');
            }
        }
    });

// Инициализация и запуск
(async () => {
    try {
        // Инициализация бота
        await bot.init();

        // Запуск отладочного веб-интерфейса если он включен
        if (config.webInterface.enabled) {
            const debugServer = new DebugServer();
            await debugServer.start();
            console.log(`Отладочный веб-интерфейс доступен на http://localhost:${config.webInterface.port}`);
        }

        // Запуск бота
        await bot.start();
        console.log('Бот запущен и готов к работе! Используйте команду "помощь" для просмотра доступных команд.');
    } catch (error) {
        console.error('Ошибка при запуске бота:', error);
        process.exit(1);
    }
})();
