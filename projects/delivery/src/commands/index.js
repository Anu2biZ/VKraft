const COMMANDS = require('../constants/commands');
const { createMainKeyboard } = require('../keyboards');

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
            name: COMMANDS.DELIVERY,
            handler: async (ctx) => {
                await bot.scenes.enter(ctx.peerId, 'categories', ctx);
            }
        })
        .command({
            name: COMMANDS.CHECKOUT,
            handler: async (ctx) => {
                await bot.scenes.enter(ctx.peerId, 'payment', ctx);
            }
        })
        .command({
            name: COMMANDS.CANCEL,
            handler: async (ctx) => {
                const cartItems = (await bot.getAllDocuments('cart'))
                    .filter(item => item.userId === ctx.peerId);
                
                for (const item of cartItems) {
                    await bot.deleteDocument('cart', item._id);
                }

                await bot.reply(ctx, 'Заказ отменен. Возвращаемся в главное меню.', 'main');
                await bot.scenes.enter(ctx.peerId, 'main', ctx);
            }
        })
        .command({
            name: COMMANDS.BACK,
            handler: async (ctx) => {
                const state = await ctx.getState();
                switch (state) {
                    case 'categories':
                        await bot.scenes.enter(ctx.peerId, 'main', ctx);
                        break;
                    case 'pizza_selection':
                    case 'payment':
                        await bot.scenes.enter(ctx.peerId, 'categories', ctx);
                        break;
                    default:
                        await bot.scenes.enter(ctx.peerId, 'main', ctx);
                }
            }
        });
}

module.exports = registerCommands;
