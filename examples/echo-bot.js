const { bot } = require('../lib/index.js');
const DebugServer = require('../web/server.js');

// Инициализация бота с токеном
bot.init('vk1.a.2RWsE45TWYRF3EINhXJeB_VCtJ8FmLCkOJIT_zMr0zKF3xVUSxV-XTcvsW1nXy_lrEEGp_WeIEqAjDVFcO_iw9C07T9CjsF8Dj5uMZ6tWwslIO1WCWERjFo25usq3Ljo1a_mKRXVevE0LdevUxWC2gv_WQeS5ZdjZRp4_bN2hCgIzDD5R7LpSKfCnge_dnDtvGcjwrJP_FE-0mOAq2y5MQ');

// Определяем команды
const COMMANDS = {
    HELLO: 'привет',
    HELP: 'помощь',
    IMAGE: 'картинка',
    BACK: 'назад',
    CONTACT: 'связаться с человеком'
};

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
        `- ${COMMANDS.IMAGE}: получить случайную картинку`,
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
        'main'
    );
};

// Регистрация команд
console.log('Регистрация команд...');
bot.command(COMMANDS.HELLO, handleHello);
bot.command(COMMANDS.HELP, handleHelp);
bot.command(COMMANDS.IMAGE, handleImage);
bot.command(COMMANDS.BACK, handleBack);
bot.command(COMMANDS.CONTACT, handleContact);

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
        case COMMANDS.BACK:
            await handleBack(ctx);
            break;
        case COMMANDS.CONTACT:
            await handleContact(ctx);
            break;
        default:
            // Если не команда, отправляем эхо с текущей клавиатурой
            const currentState = ctx.getState() || 'main';
            await bot.sendText(ctx.peerId, `Вы написали: ${ctx.message.text}`, currentState);
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
