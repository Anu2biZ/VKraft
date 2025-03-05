const { bot } = require('../../lib/index.js');
const DebugServer = require('../../web/server.js');
const config = require('../../lib/config');

// Определяем команды
const COMMANDS = {
    START: 'начать',
    HELP: 'помощь',
    DELIVERY: 'доставка',
    BACK: 'назад',
    CANCEL: 'отменить заказ',
    CHECKOUT: 'оформить заказ',
    PAYMENT: 'перейти к оплате'
};

// Регистрируем сцены
bot.scenes
    // Главная сцена
    .scene('main', {
        async enter(ctx) {
            // Создаем клавиатуру и отправляем приветствие
            const keyboard = [
                [
                    { text: COMMANDS.DELIVERY, color: 'primary' },
                    { text: COMMANDS.HELP, color: 'secondary' }
                ]
            ];
            bot.keyboard('main', keyboard);
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
    })

    // Сцена выбора категории
    .scene('categories', {
        async enter(ctx) {
            const categories = await bot.getAllDocuments('categories');
            const cartItems = (await bot.getAllDocuments('cart'))
                .filter(item => item.userId === ctx.peerId);

            // Создаем кнопки категорий
            const buttons = [
                categories.map(category => ({
                    text: category.name,
                    color: category.color
                })),
                [
                    { text: COMMANDS.BACK, color: 'secondary' },
                    ...(cartItems.length > 0 ? [{ text: COMMANDS.CHECKOUT, color: 'primary' }] : [])
                ]
            ];

            bot.keyboard('categories', buttons);
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
    })

    // Сцена выбора пиццы
    .scene('pizza_selection', {
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

            // Создаем кнопки для пицц
            const buttons = [
                ...pizzas.map(pizza => [{
                    text: `🛒 ${pizza.name}`,
                    color: 'positive',
                    payload: { command: 'add_to_cart', pizzaName: pizza.name }
                }]),
                [
                    { text: COMMANDS.BACK, color: 'secondary' },
                    { text: COMMANDS.CHECKOUT, color: 'primary' }
                ]
            ];

            bot.keyboard(`category_${category.code}`, buttons);
            await bot.reply(ctx, 'Выберите пиццу для добавления в корзину:', `category_${category.code}`);
        },
        async handle(ctx) {
            console.log('Контекст сообщения:', {
                text: ctx.message?.text,
                payload: ctx.message?.payload,
                messagePayload: ctx.messagePayload, // vk-io может хранить payload здесь
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
    })

    // Сцена оплаты
    .scene('payment', {
        async enter(ctx) {
            // Создаем клавиатуру
            bot.keyboard('payment', [
                [
                    { text: COMMANDS.BACK, color: 'secondary' },
                    { text: COMMANDS.PAYMENT, color: 'positive' }
                ]
            ]);

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
                const keyboard = [
                    [
                        { text: COMMANDS.DELIVERY, color: 'primary' },
                        { text: COMMANDS.HELP, color: 'secondary' }
                    ]
                ];
                bot.keyboard('main', keyboard);
                
                await bot.reply(
                    ctx,
                    'Спасибо за заказ! Это демо-бот, поэтому оплата не требуется.',
                    'main'
                );
                
                // Устанавливаем состояние без вызова enter
                await bot.setState(ctx.peerId, 'main');
            }
        }
    });

// Регистрируем команды
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

// Инициализация и запуск
(async () => {
    try {
        // Инициализируем бота с подключением к БД
        await bot.init({
            dbUri: config.database.uri
        });

        // Очищаем коллекции и добавляем тестовые данные
        const data = require('./data/pizzas.js');
        
        console.log('Очистка коллекций...');
        await bot.clearCollection('categories');
        await bot.clearCollection('pizzas');
        await bot.clearCollection('cart');
        await bot.clearCollection('user_states');

        console.log('Добавление категорий...');
        for (const category of data.categories) {
            await bot.addDocument('categories', category);
            console.log(`✓ Добавлена категория: ${category.name}`);
        }

        console.log('Добавление пицц...');
        for (const pizza of data.pizzas) {
            await bot.addDocument('pizzas', pizza);
            console.log(`✓ Добавлена пицца: ${pizza.name}`);
        }

        // Запускаем отладочный веб-интерфейс если он включен
        if (config.webInterface.enabled) {
            const debugServer = new DebugServer();
            await debugServer.start();
            console.log(`Отладочный веб-интерфейс доступен на http://localhost:${config.webInterface.port}`);
        }

        // Запускаем бота
        await bot.start();
        console.log('Бот запущен и готов к работе!');
    } catch (error) {
        console.error('Ошибка при запуске бота:', error);
        process.exit(1);
    }
})();
