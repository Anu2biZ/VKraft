const COMMANDS = require('../constants/commands');
const { createPaymentKeyboard, createMainKeyboard } = require('../keyboards');

// Сцена оплаты
function createPaymentScene(bot) {
    return {
        name: 'payment',
        async enter(ctx) {
            // Создаем клавиатуру
            createPaymentKeyboard(bot);

            const cartItems = (await bot.getAllDocuments('cart'))
                .filter(item => item.userId === ctx.peerId);
            
            const total = cartItems.reduce((sum, item) => sum + item.pizza.price, 0);
            
            await bot.reply(
                ctx,
                'Ваш заказ:\n' +
                cartItems.map(item => `- ${item.pizza.name} (${item.pizza.price} руб.)`).join('\n') +
                `\n\nИтого: ${total} руб.`,
                'payment'
            );
        },
        async handle(ctx) {
            const text = ctx.message?.text?.toLowerCase();
            if (text === COMMANDS.PAYMENT) {
                const cartItems = (await bot.getAllDocuments('cart'))
                    .filter(item => item.userId === ctx.peerId);
                
                for (const item of cartItems) {
                    await bot.deleteDocument('cart', item._id);
                }

                // Создаем клавиатуру для главного меню
                createMainKeyboard(bot);
                
                await bot.reply(
                    ctx,
                    'Спасибо за заказ! Это демо-бот, поэтому оплата не требуется.',
                    'main'
                );
                
                // Устанавливаем состояние без вызова enter
                await bot.setState(ctx.peerId, 'main');
            }
        }
    };
}

module.exports = createPaymentScene;
