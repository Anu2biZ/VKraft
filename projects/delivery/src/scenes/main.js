const COMMANDS = require('../constants/commands');
const { createMainKeyboard } = require('../keyboards');

// Главная сцена
function createMainScene(bot) {
    return {
        name: 'main',
        async enter(ctx) {
            // Создаем клавиатуру и отправляем приветствие
            createMainKeyboard(bot);
            await bot.reply(ctx, 'Добро пожаловать в пиццерию! Я помогу вам сделать заказ.', 'main');
        },
        async handle(ctx) {
            const text = ctx.message?.text?.toLowerCase();
            if (text === COMMANDS.HELP) {
                await bot.reply(ctx, 
                    'Доступные команды:\n' +
                    `- ${COMMANDS.START}: начать заказ\n` +
                    `- ${COMMANDS.HELP}: показать это сообщение\n` +
                    `- ${COMMANDS.DELIVERY}: заказать доставку\n` +
                    `- ${COMMANDS.CANCEL}: отменить текущий заказ`,
                    'main'
                );
            } else if (text === COMMANDS.DELIVERY) {
                await bot.scenes.enter(ctx.peerId, 'categories', ctx);
            } else {
                await bot.reply(ctx, `Вы написали: ${ctx.message?.text}`, 'main');
            }
        }
    };
}

module.exports = createMainScene;
