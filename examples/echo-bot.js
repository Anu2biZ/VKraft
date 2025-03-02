const { bot } = require('../lib/index.js');
const DebugServer = require('../web/server.js');
const config = require('../lib/config');

// Проверяем режим работы и настройки
if (process.env.NODE_ENV === 'production') {
    if (!process.env.VK_TOKEN) {
        console.error('ОШИБКА: Для работы в production режиме необходимо указать токен VK в файле .env');
        console.error('Пример настройки:');
        console.error('1. Скопируйте файл .env.example в .env');
        console.error('2. Укажите ваш токен VK в переменной VK_TOKEN');
        process.exit(1);
    }
}

// Определяем команды
const COMMANDS = {
    HELLO: 'привет',
    HELP: 'помощь',
    IMAGE: 'картинка',
    BACK: 'назад',
    CONTACT: 'связаться с человеком',
    DB_TEST: 'тест бд'
};

// Инициализация бота
bot.init();

// Обработчики команд
const handleHello = async (ctx) => {
    console.log('Выполняется команда привет');
    await bot.sendText(ctx.peerId, 'Привет! Я эхо-бот. Напиши мне что-нибудь!', 'main');
    ctx.setState('main');
};

const handleHelp = async (ctx) => {
    console.log('Выполняется команда помощь');
    await bot.sendText(
        ctx.peerId,
        'Доступные команды:\n' +
        `- ${COMMANDS.HELLO}: начать диалог\n` +
        `- ${COMMANDS.HELP}: показать это сообщение\n` +
        `- ${COMMANDS.IMAGE}: получить случайную картинку\n` +
        `- ${COMMANDS.DB_TEST}: тест работы с базой данных`,
        'help'
    );
    ctx.setState('help');
};

const handleImage = async (ctx) => {
    console.log('Выполняется команда картинка');
    await bot.sendImg(
        ctx.peerId,
        'https://picsum.photos/400/300',
        'main'
    );
};

const handleBack = async (ctx) => {
    console.log('Выполняется команда назад');
    await handleHello(ctx);
};

const handleContact = async (ctx) => {
    console.log('Выполняется команда связаться с человеком');
    await bot.sendText(
        ctx.peerId,
        'Наш оператор свяжется с вами в ближайшее время.',
        'help'
    );
};

const handleDbTest = async (ctx) => {
    console.log('Выполняется команда тест БД');
    try {
        // Добавляем тестовую запись в коллекцию
        const testData = {
            userId: ctx.peerId,
            message: ctx.text,
            timestamp: new Date(),
            type: 'test'
        };

        await bot.addDocument('test_messages', testData);
        
        // Получаем все записи из коллекции
        const allMessages = await bot.getAllDocuments('test_messages');
        
        await bot.sendText(
            ctx.peerId,
            `Запись добавлена в БД!\nВсего записей: ${allMessages.length}`,
            'main'
        );
    } catch (error) {
        console.error('Ошибка при тестировании БД:', error);
        await bot.sendText(
            ctx.peerId,
            'Произошла ошибка при работе с базой данных',
            'main'
        );
    }
};

// Регистрация команд
console.log('Регистрация команд...');
bot.command(COMMANDS.HELLO, handleHello);
bot.command(COMMANDS.HELP, handleHelp);
bot.command(COMMANDS.IMAGE, handleImage);
bot.command(COMMANDS.BACK, handleBack);
bot.command(COMMANDS.CONTACT, handleContact);
bot.command(COMMANDS.DB_TEST, handleDbTest);

// Регистрация клавиатур
bot.registerKeyboard('main', {
    buttons: [
        {
            text: COMMANDS.HELLO,
            color: 'primary',
            row: 0
        },
        {
            text: COMMANDS.HELP,
            color: 'secondary',
            row: 0
        },
        {
            text: COMMANDS.IMAGE,
            color: 'positive',
            row: 0
        },
        {
            text: COMMANDS.DB_TEST,
            color: 'primary',
            row: 1
        }
    ]
});

bot.registerKeyboard('help', {
    buttons: [
        {
            text: COMMANDS.BACK,
            color: 'negative',
            row: 0,
            payload: { command: COMMANDS.HELLO }
        },
        {
            text: COMMANDS.CONTACT,
            color: 'primary',
            row: 1
        }
    ]
});

// Обработка сообщений
bot.on('message', async (ctx) => {
    // Получаем текст сообщения
    const text = (ctx.message?.text || '').toLowerCase();
    console.log('Получено сообщение:', text);

    // Проверяем команды
    switch(text) {
        case COMMANDS.HELLO:
            await handleHello(ctx);
            break;
        case COMMANDS.HELP:
            await handleHelp(ctx);
            break;
        case COMMANDS.IMAGE:
            await handleImage(ctx);
            break;
        case COMMANDS.BACK:
            await handleBack(ctx);
            break;
        case COMMANDS.CONTACT:
            await handleContact(ctx);
            break;
        case COMMANDS.DB_TEST:
            await handleDbTest(ctx);
            break;
        default:
            // Если не команда, отправляем эхо с текущей клавиатурой
            const currentState = ctx.getState() || 'main';
            const messageText = ctx.message?.text || 'неизвестное сообщение';
            await bot.sendText(ctx.peerId, `Вы написали: ${messageText}`, currentState);
    }
});

// Обработчик старта
bot.on('start', () => {
    console.log('Бот запущен и готов к работе! Используйте команду "помощь" для просмотра доступных команд.');
});

// Запуск отладочного веб-интерфейса если он включен
if (config.webInterface.enabled) {
    const debugServer = new DebugServer();
    debugServer.start().then(() => {
        console.log(`Отладочный веб-интерфейс доступен на http://localhost:${config.webInterface.port}`);
    });
}

// Запуск бота
console.log('Запуск бота...');
bot.start();
