const COMMANDS = require('../constants/commands');
const { createPizzaSelectionKeyboard } = require('../keyboards');

// Сцена выбора пиццы
function createPizzaSelectionScene(bot) {
    return {
        name: 'pizza_selection',
        async enter(ctx) {
            const category = ctx.getUserData('selectedCategory');
            const pizzas = (await bot.getAllDocuments('pizzas'))
                .filter(p => p.categoryId === category.code);

            // Отправляем пиццы с картинками
            await bot.reply(ctx, `Доступные пиццы в категории ${category.name}:`);
            
            for (const pizza of pizzas) {
                await bot.sendImgWithText(
                    ctx.peerId,
                    `🍕 ${pizza.name}\n📝 ${pizza.description}\n💰 Цена: ${pizza.price} руб.`,
                    pizza.image
                );
            }

            // Создаем клавиатуру для выбора пицц
            createPizzaSelectionKeyboard(bot, category, pizzas);
            await bot.reply(ctx, 'Выберите пиццу для добавления в корзину:', `category_${category.code}`);
        },
        async handle(ctx) {
            console.log('Контекст сообщения:', {
                text: ctx.message?.text,
                payload: ctx.message?.payload,
                messagePayload: ctx.messagePayload,
                message: ctx.message
            });

            const text = ctx.message?.text?.toLowerCase();
            // В production режиме payload может быть в разных местах
            let payload = ctx.message?.payload || ctx.messagePayload;
            console.log('Исходный payload:', payload, 'Тип:', typeof payload);
            
            if (typeof payload === 'string') {
                try {
                    payload = JSON.parse(payload);
                    console.log('Распарсенный payload:', payload);
                } catch (e) {
                    console.error('Ошибка парсинга payload:', e);
                }
            }
            
            console.log('Итоговый payload:', payload);

            if (text === COMMANDS.CHECKOUT) {
                await bot.scenes.enter(ctx.peerId, 'payment', ctx);
                return;
            }
            
            if (payload && payload.command === 'add_to_cart') {
                const pizzas = await bot.getAllDocuments('pizzas');
                const pizza = pizzas.find(p => p.name === payload.pizzaName);
                
                if (pizza) {
                    await bot.addDocument('cart', {
                        userId: ctx.peerId,
                        pizza: pizza,
                        timestamp: new Date()
                    });

                    const category = ctx.getUserData('selectedCategory');
                    await bot.reply(
                        ctx,
                        `✅ Пицца "${pizza.name}" добавлена в корзину!\nМожете добавить еще пиццы этой категории или оформить заказ.`,
                        `category_${category.code}`
                    );
                }
            }
        }
    };
}

module.exports = createPizzaSelectionScene;
