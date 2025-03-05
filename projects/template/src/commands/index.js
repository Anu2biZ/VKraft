const COMMANDS = require('../constants/commands');

// Регистрация команд бота
function registerCommands(bot) {
    bot.commands
        .command({
            name: COMMANDS.START,
            handler: async (ctx) => {
                await bot.scenes.enter(ctx.peerId, 'main', ctx);
            }
        })
        .command({
            name: COMMANDS.HELP,
            handler: async (ctx) => {
                await bot.reply(ctx, 
                    'Доступные команды:\n' +
                    `- ${COMMANDS.START}: начать\n` +
                    `- ${COMMANDS.HELP}: показать это сообщение`,
                    'main'
                );
            }
        });
    
    // Здесь можно добавить другие команды
}

module.exports = registerCommands;
