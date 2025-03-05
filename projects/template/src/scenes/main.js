const COMMANDS = require('../constants/commands');
const { createMainKeyboard } = require('../keyboards');

// Главная сцена
function createMainScene(bot) {
    return {
        name: 'main',
        async enter(ctx) {
            // Создаем клавиатуру и отправляем приветствие
            createMainKeyboard(bot);
            await bot.reply(ctx, 'Привет! Я новый бот.', 'main');
        },
        async handle(ctx) {
            const text = ctx.message?.text?.toLowerCase();
            if (text === COMMANDS.HELP) {
                await bot.reply(ctx, 
                    'Доступные команды:\n' +
                    `- ${COMMANDS.START}: начать\n` +
                    `- ${COMMANDS.HELP}: показать это сообщение`,
                    'main'
                );
            } else {
                await bot.reply(ctx, `Вы написали: ${ctx.message?.text}`, 'main');
            }
        }
    };
}

module.exports = createMainScene;
