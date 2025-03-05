const COMMANDS = require('../constants/commands');
const { createCategoriesKeyboard } = require('../keyboards');

// Сцена выбора категории
function createCategoriesScene(bot) {
    return {
        name: 'categories',
        async enter(ctx) {
            const categories = await bot.getAllDocuments('categories');
            const cartItems = (await bot.getAllDocuments('cart'))
                .filter(item => item.userId === ctx.peerId);

            // Создаем клавиатуру категорий
            createCategoriesKeyboard(bot, categories, cartItems.length > 0);
            await bot.reply(ctx, 'Выберите категорию пиццы:', 'categories');
        },
        async handle(ctx) {
            const text = ctx.message?.text?.toLowerCase();

            if (text === COMMANDS.CHECKOUT) {
                await bot.scenes.enter(ctx.peerId, 'payment', ctx);
                return;
            }

            const categories = await bot.getAllDocuments('categories');
            const category = categories.find(c => 
                c.name.toLowerCase() === text || c.name === text
            );

            if (category) {
                ctx.setUserData('selectedCategory', category);
                await bot.scenes.enter(ctx.peerId, 'pizza_selection', ctx);
            }
        }
    };
}

module.exports = createCategoriesScene;
