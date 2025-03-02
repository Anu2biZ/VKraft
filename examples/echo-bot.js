const { bot } = require('../lib/index.js');
const DebugServer = require('../web/server.js');

// Инициализация бота с токеном
bot.init('vk1.a.2RWsE45TWYRF3EINhXJeB_VCtJ8FmLCkOJIT_zMr0zKF3xVUSxV-XTcvsW1nXy_lrEEGp_WeIEqAjDVFcO_iw9C07T9CjsF8Dj5uMZ6tWwslIO1WCWERjFo25usq3Ljo1a_mKRXVevE0LdevUxWC2gv_WQeS5ZdjZRp4_bN2hCgIzDD5R7LpSKfCnge_dnDtvGcjwrJP_FE-0mOAq2y5MQ');

// Определяем команды
const COMMANDS = {
    HELLO: 'привет',
    HELP: 'помощь',
    IMAGE: 'картинка'
};

// Обработчики команд
const handleHello = async (ctx) => {
    console.log('Выполняется команда привет');
    await bot.sendText(ctx.peerId, 'Привет! Я эхо-бот. Напиши мне что-нибудь!');
};

const handleHelp = async (ctx) => {
    console.log('Выполняется команда помощь');
    await bot.sendText(
        ctx.peerId,
        'Доступные команды:\n' +
        `- ${COMMANDS.HELLO}: начать диалог\n` +
        `- ${COMMANDS.HELP}: показать это сообщение\n` +
        `- ${COMMANDS.IMAGE}: получить случайную картинку`
    );
};

const handleImage = async (ctx) => {
    console.log('Выполняется команда картинка');
    await bot.sendImg(
        ctx.peerId,
        'https://picsum.photos/400/300'
    );
};

// Регистрация команд
console.log('Регистрация команд...');
bot.command(COMMANDS.HELLO, handleHello);
bot.command(COMMANDS.HELP, handleHelp);
bot.command(COMMANDS.IMAGE, handleImage);

// Настройка клавиатуры
bot.setKeyboards([
    {
        text: COMMANDS.HELLO,
        color: 'primary'
    },
    {
        text: COMMANDS.HELP,
        color: 'secondary'
    },
    {
        text: COMMANDS.IMAGE,
        color: 'positive'
    }
]);

// Обработка сообщений
bot.on('message', async (ctx) => {
    const text = ctx.message.text.toLowerCase();
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
        default:
            // Если не команда, отправляем эхо
            await bot.sendText(ctx.peerId, `Вы написали: ${ctx.message.text}`);
    }
});

// Обработчик старта
bot.on('start', () => {
    console.log('Бот запущен и готов к работе! Используйте команду "помощь" для просмотра доступных команд.');
});

// Запуск отладочного веб-интерфейса
const debugServer = new DebugServer();
debugServer.start(3001).then(() => {
    console.log('Отладочный веб-интерфейс доступен на http://localhost:3001');
});

// Запуск бота
console.log('Запуск бота...');
bot.start();
