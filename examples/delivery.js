const { bot } = require('../lib/index.js');
const DebugServer = require('../web/server.js');
const config = require('../lib/config');

// Проверяем режим работы и настройки
if (process.env.NODE_ENV === 'production') {
    if (!process.env.VK_TOKEN) {
        console.error('ОШИБКА: Для работы в production режиме необходимо указать токен VK в файле .env');
        console.error('Пример настройки:');
        console.error('1. Скопируйте файл .env.example в .env');
        console.error('2. Укажите ваш токен VK в переменной VK_TOKEN');
        process.exit(1);
    }
}

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

// Кэш для данных
let categoriesCache = null;
let pizzasCache = null;

// Функция получения категорий (с кэшированием)
const getCategories = async () => {
    if (categoriesCache) {
        return categoriesCache;
    }
    categoriesCache = await bot.getAllDocuments('categories');
    return categoriesCache;
};

// Функция получения пицц (без кэширования для отладки)
const getPizzas = async () => {
    console.log('Получаем пиццы из БД...');
    const pizzas = await bot.getAllDocuments('pizzas');
    console.log('Получены пиццы из БД:', JSON.stringify(pizzas, null, 2));
    return pizzas;
};

// Обработчики команд
const handleStart = async (ctx) => {
    console.log('=== Выполняется команда начать ===');
    console.log('ID пользователя:', ctx.peerId);
    console.log('Текущее состояние:', await ctx.getState());
    
    try {
        // Регистрируем главную клавиатуру заново
        console.log('Регистрация главной клавиатуры...');
        bot.registerKeyboard('main', {
            buttons: [
                {
                    text: COMMANDS.DELIVERY,
                    color: 'primary',
                    row: 0
                },
                {
                    text: COMMANDS.HELP,
                    color: 'secondary',
                    row: 0
                }
            ]
        });
        console.log('Главная клавиатура зарегистрирована');

        console.log('Отправка приветственного сообщения...');
        await bot.sendText(
            ctx.peerId,
            'Добро пожаловать в пиццерию! Я помогу вам сделать заказ.',
            'main'
        );
        console.log('Приветственное сообщение отправлено');
        
        console.log('Установка состояния main...');
        await ctx.setState('main');
        console.log('Состояние main установлено');
    } catch (error) {
        console.error('Ошибка в handleStart:', error);
    }
};

const handleHelp = async (ctx) => {
    console.log('Выполняется команда помощь');
    await bot.sendText(
        ctx.peerId,
        'Доступные команды:\n' +
        `- ${COMMANDS.START}: начать заказ\n` +
        `- ${COMMANDS.HELP}: показать это сообщение\n` +
        `- ${COMMANDS.DELIVERY}: заказать доставку\n` +
        `- ${COMMANDS.CANCEL}: отменить текущий заказ`,
        'main'
    );
};

const handleDelivery = async (ctx) => {
    console.log('=== Выполняется команда доставка ===');
    console.log('ID пользователя:', ctx.peerId);
    console.log('Текущее состояние:', await ctx.getState());

    try {
        // Получаем категории
        console.log('Получение категорий...');
        const categories = await getCategories();
        console.log('Доступные категории:', categories.map(c => c.name));

        // Проверяем есть ли пиццы в корзине
        console.log('Проверка корзины...');
        const cartItems = (await bot.getAllDocuments('cart'))
            .filter(item => item.userId === ctx.peerId);
        console.log('Найдено товаров в корзине:', cartItems.length);

        // Создаем клавиатуру с категориями
        console.log('Создание кнопок категорий...');
        const categoryButtons = categories.map((category, index) => ({
            text: category.name,
            color: category.color,
            row: 0
        }));

        // Добавляем кнопки навигации
        console.log('Добавление кнопок навигации...');
        categoryButtons.push({
            text: COMMANDS.BACK,
            color: 'secondary',
            row: 1
        });

        // Если в корзине есть пиццы, добавляем кнопку оформления заказа
        if (cartItems.length > 0) {
            console.log('Добавление кнопки оформления заказа...');
            categoryButtons.push({
                text: COMMANDS.CHECKOUT,
                color: 'primary',
                row: 1
            });
        }

        // Регистрируем клавиатуру
        console.log('Регистрация клавиатуры категорий...');
        console.log('Кнопки:', JSON.stringify(categoryButtons, null, 2));
        bot.registerKeyboard('categories', {
            buttons: categoryButtons
        });
        console.log('Клавиатура категорий зарегистрирована');

        console.log('Отправка сообщения с клавиатурой...');
        await bot.sendText(
            ctx.peerId,
            'Выберите категорию пиццы:',
            'categories'
        );
        console.log('Сообщение с клавиатурой отправлено');

        console.log('Установка состояния categories...');
        await ctx.setState('categories');
        console.log('Состояние categories установлено');
    } catch (error) {
        console.error('Ошибка в handleDelivery:', error);
    }
};

const handleCategory = async (ctx, categoryName) => {
    console.log('=== Начало обработки выбора категории ===');
    console.log('Выбрана категория:', categoryName);
    
    // Получаем категорию из БД
    const categories = await getCategories();
    console.log('Все доступные категории:', categories);
    
    const category = categories.find(c => c.name === categoryName);
    console.log('Найденная категория:', category);
    
    if (!category) {
        console.error('Категория не найдена:', categoryName);
        return;
    }

    // Получаем пиццы выбранной категории
    console.log('Запрашиваем все пиццы из БД...');
    const pizzas = await getPizzas();
    
    if (!Array.isArray(pizzas)) {
        console.error('Ошибка: pizzas не является массивом:', pizzas);
        return;
    }
    
    console.log('Получены пиццы из БД:', pizzas.length, 'шт.');
    console.log('Фильтруем пиццы для категории:', category.code);
    
    const categoryPizzas = pizzas.filter(p => {
        const match = p.categoryId === category.code;
        console.log(`Пицца "${p.name}": categoryId=${p.categoryId}, нужен=${category.code}, совпадение=${match}`);
        return match;
    });
    
    console.log('Найдено пицц в категории:', categoryPizzas.length);
    console.log('Пиццы в категории:', categoryPizzas.map(p => p.name));
    
    // Сохраняем состояние с информацией о категории
    await ctx.setState(`pizza_selection:${category.code}`);

    // Отправляем сообщение с пиццами
    await bot.sendText(ctx.peerId, `Доступные пиццы в категории ${category.name}:`, null);
    
    // Отправляем все изображения параллельно
    console.log('Отправка пицц категории:', categoryPizzas);
    for (const pizza of categoryPizzas) {
        console.log('Отправка пиццы:', pizza.name, pizza.image);
        try {
            await bot.sendImgWithText(
                ctx.peerId,
                `🍕 ${pizza.name}\n📝 ${pizza.description}\n💰 Цена: ${pizza.price} руб.`,
                pizza.image
            );
            console.log('Пицца отправлена успешно:', pizza.name);
        } catch (error) {
            console.error('Ошибка при отправке пиццы:', pizza.name, error);
        }
    }

    // Создаем одну общую клавиатуру для выбора пиццы
    const pizzaButtons = categoryPizzas.map((pizza, index) => ({
        text: `🛒 ${pizza.name}`,
        color: 'positive',
        row: Math.floor(index / 2), // Размещаем по 2 кнопки в ряд
        payload: {
            command: 'add_to_cart',
            pizzaName: pizza.name
        }
    }));

    // Проверяем есть ли пиццы в корзине
    const cartItems = (await bot.getAllDocuments('cart'))
        .filter(item => item.userId === ctx.peerId);

    // Добавляем кнопки навигации
    pizzaButtons.push({
        text: COMMANDS.BACK,
        color: 'secondary',
        row: Math.ceil(pizzaButtons.length / 2) // Помещаем кнопку "Назад" в новый ряд
    });

    // Если в корзине есть пиццы, добавляем кнопку оформления заказа
    if (cartItems.length > 0) {
        pizzaButtons.push({
            text: COMMANDS.CHECKOUT,
            color: 'primary',
            row: Math.ceil(pizzaButtons.length / 2) // В том же ряду что и "Назад"
        });
    }

    // Регистрируем клавиатуру
    const keyboardName = `category_${category.code}_selection`;
    console.log('Регистрация клавиатуры для выбора пиццы:', keyboardName);
    console.log('Кнопки:', JSON.stringify(pizzaButtons, null, 2));
    
    try {
        bot.registerKeyboard(keyboardName, {
            buttons: pizzaButtons
        });
        console.log('Клавиатура для выбора пиццы зарегистрирована');

        console.log('Отправка сообщения с клавиатурой...');
        await bot.sendText(
            ctx.peerId,
            'Выберите пиццу для добавления в корзину:',
            keyboardName
        );
        console.log('Сообщение с клавиатурой отправлено');
    } catch (error) {
        console.error('Ошибка при регистрации клавиатуры или отправке сообщения:', error);
    }
};

const handleCheckout = async (ctx) => {
    console.log('Выполняется оформление заказа');
    // Получаем корзину пользователя
    const cartItems = (await bot.getAllDocuments('cart'))
        .filter(item => item.userId === ctx.peerId);
    
    if (cartItems.length === 0) {
        await bot.sendText(
            ctx.peerId,
            'Ваша корзина пуста! Сначала добавьте пиццы в заказ.',
            'main'
        );
        return;
    }

    // Считаем общую сумму
    const total = cartItems.reduce((sum, item) => sum + item.pizza.price, 0);
    
    // Регистрируем клавиатуру для оплаты
    bot.registerKeyboard('payment', {
        buttons: [
            {
                text: COMMANDS.BACK,
                color: 'secondary',
                row: 0
            },
            {
                text: 'Перейти к оплате',
                color: 'positive',
                row: 0
            }
        ]
    });

    await bot.sendText(
        ctx.peerId,
        'Ваш заказ:\n' +
        cartItems.map(item => `- ${item.pizza.name} (${item.pizza.price} руб.)`).join('\n') +
        `\n\nИтого: ${total} руб.`,
        'payment'
    );
    
    await ctx.setState('payment');
};

const handleCancel = async (ctx) => {
    console.log('Отмена заказа');
    // Очищаем корзину пользователя
    const cartItems = (await bot.getAllDocuments('cart'))
        .filter(item => item.userId === ctx.peerId);
    
    for (const item of cartItems) {
        await bot.deleteDocument('cart', item._id);
    }

    await bot.sendText(
        ctx.peerId,
        'Заказ отменен. Возвращаемся в главное меню.',
        'main'
    );
    await ctx.setState('main');
};

// Обработчик добавления в корзину
const handleAddToCart = async (ctx) => {
    console.log('=== Начало обработки добавления в корзину ===');
    console.log('Получен payload:', ctx.message?.payload);
    console.log('Тип payload:', typeof ctx.message?.payload);
    
    const pizzaName = ctx.message?.payload?.pizzaName;
    if (!pizzaName) {
        console.error('Название пиццы не найдено в payload');
        return;
    }

    console.log('Добавление пиццы в корзину:', pizzaName);
    console.log('Текущее состояние:', await ctx.getState());
    const pizzas = await getPizzas();
    const pizza = pizzas.find(p => p.name === pizzaName);

    if (!pizza) {
        console.error('Пицца не найдена:', pizzaName);
        return;
    }

    // Добавляем в корзину
    const cartItem = {
        userId: ctx.peerId,
        pizza: pizza,
        timestamp: new Date()
    };
    console.log('=== Добавление в корзину ===');
    console.log('ID пользователя:', ctx.peerId);
    console.log('Пицца:', pizza);
    console.log('Добавляем в корзину:', cartItem);
    
    try {
        const result = await bot.addDocument('cart', cartItem);
        console.log('Результат добавления в корзину:', result);
        console.log('Пицца успешно добавлена в корзину');
    } catch (error) {
        console.error('Ошибка при добавлении в корзину:', error);
        return;
    }

    // Получаем текущую категорию из пиццы
    const currentCategory = (await getCategories())
        .find(c => c.code === pizza.categoryId);
    
    if (!currentCategory) {
        console.error('Не найдена категория пиццы:', pizza.categoryId);
        return;
    }

    console.log('Текущая категория:', currentCategory);

    // Получаем пиццы текущей категории для кнопок
    const categoryPizzas = (await getPizzas())
        .filter(p => p.categoryId === currentCategory.code);

    // Создаем кнопки для пицц
    const pizzaButtons = categoryPizzas.map((p, index) => ({
        text: `🛒 ${p.name}`,
        color: 'positive',
        row: Math.floor(index / 2),
        payload: {
            command: 'add_to_cart',
            pizzaName: p.name
        }
    }));

    // Добавляем кнопки навигации
    pizzaButtons.push(
        {
            text: COMMANDS.BACK,
            color: 'secondary',
            row: Math.ceil(pizzaButtons.length / 2)
        },
        {
            text: COMMANDS.CHECKOUT,
            color: 'primary',
            row: Math.ceil(pizzaButtons.length / 2)
        }
    );

    // Регистрируем клавиатуру
    const keyboardName = `category_${currentCategory.code}_selection`;
    console.log('Регистрируем клавиатуру:', keyboardName);
    console.log('Кнопки:', JSON.stringify(pizzaButtons, null, 2));
    
    try {
        bot.registerKeyboard(keyboardName, {
            buttons: pizzaButtons
        });
        console.log('Клавиатура успешно зарегистрирована');

        // Отправляем сообщение о добавлении в корзину
        console.log('Отправляем сообщение об успешном добавлении в корзину');
        await bot.sendText(
            ctx.peerId,
            `✅ Пицца "${pizza.name}" добавлена в корзину!\nМожете добавить еще пиццы этой категории или оформить заказ.`,
            keyboardName
        );
        console.log('Сообщение успешно отправлено');
    } catch (error) {
        console.error('Ошибка при отправке сообщения:', error);
    }
    
    // Сохраняем состояние выбора пицц с информацией о категории
    await ctx.setState(`pizza_selection:${currentCategory.code}`);
};

// Функция регистрации команд и клавиатур
const registerCommandsAndKeyboards = async () => {
    console.log('=== Начало регистрации команд и клавиатур ===');
    
    try {
        console.log('Регистрация основных команд...');
        bot.command(COMMANDS.START, handleStart);
        bot.command(COMMANDS.HELP, handleHelp);
        bot.command(COMMANDS.DELIVERY, handleDelivery);
        bot.command(COMMANDS.CANCEL, handleCancel);
        bot.command(COMMANDS.CHECKOUT, handleCheckout);

        // Регистрируем команду оплаты в обоих регистрах
        const handlePayment = async (ctx) => {
            if (await ctx.getState() === 'payment') {
                console.log('Обработка команды "Перейти к оплате"');
                // Очищаем корзину пользователя
                const cartItems = (await bot.getAllDocuments('cart'))
                    .filter(item => item.userId === ctx.peerId);
                
                console.log('Очистка корзины пользователя...');
                for (const item of cartItems) {
                    await bot.deleteDocument('cart', item._id);
                }
                console.log('Корзина очищена');

                console.log('Отправка сообщения о завершении заказа...');
                await bot.sendText(
                    ctx.peerId,
                    'Спасибо за заказ! Это демо-бот, поэтому оплата не требуется.',
                    'main'
                );
                await ctx.setState('main');
                console.log('Заказ завершен, установлено состояние main');
            }
        };
        
        // Регистрируем команду в обоих регистрах
        bot.command('перейти к оплате', handlePayment);
        bot.command('Перейти к оплате', handlePayment);
        console.log('Основные команды зарегистрированы');

        // Регистрируем категории как команды
        console.log('Получение категорий из БД...');
        const categories = await getCategories();
        console.log('Найдено категорий:', categories.length);
        
        console.log('Регистрация команд для категорий...');
        categories.forEach(category => {
            console.log(`Регистрация команд для категории: ${category.name}`);
            // Регистрируем команду для точного названия
            bot.command(category.name, (ctx) => handleCategory(ctx, category.name));
            // И для названия в нижнем регистре
            bot.command(category.name.toLowerCase(), (ctx) => handleCategory(ctx, category.name));
            console.log(`Зарегистрированы команды: "${category.name}" и "${category.name.toLowerCase()}"`);
        });
        console.log('Команды категорий зарегистрированы');

        console.log('Регистрация клавиатур...');
        console.log('Регистрация главной клавиатуры...');
        bot.registerKeyboard('main', {
            buttons: [
                {
                    text: COMMANDS.DELIVERY,
                    color: 'primary',
                    row: 0
                },
                {
                    text: COMMANDS.HELP,
                    color: 'secondary',
                    row: 0
                }
            ]
        });
        console.log('Главная клавиатура зарегистрирована');

        console.log('Проверка корзины...');
        const cartItems = (await bot.getAllDocuments('cart'))
            .filter(item => item.userId === 1); // Используем 1 как peerId в development режиме
        console.log('Найдено товаров в корзине:', cartItems.length);

        console.log('Создание клавиатуры категорий...');
        const categoryButtons = categories.map((category, index) => ({
            text: category.name,
            color: category.color,
            row: 0
        }));

        // Добавляем кнопки навигации
        categoryButtons.push({
            text: COMMANDS.BACK,
            color: 'secondary',
            row: 1
        });

        // Если в корзине есть пиццы, добавляем кнопку оформления заказа
        if (cartItems.length > 0) {
            categoryButtons.push({
                text: COMMANDS.CHECKOUT,
                color: 'primary',
                row: 1
            });
        }

        console.log('Регистрация клавиатуры категорий...');
        console.log('Кнопки:', JSON.stringify(categoryButtons, null, 2));
        bot.registerKeyboard('categories', {
            buttons: categoryButtons
        });
        console.log('Клавиатура категорий зарегистрирована');

        console.log('Регистрация дополнительных клавиатур...');
        bot.registerKeyboard('pizza_actions', {
            buttons: [
                {
                    text: COMMANDS.BACK,
                    color: 'secondary',
                    row: 0
                },
                {
                    text: COMMANDS.CANCEL,
                    color: 'negative',
                    row: 0
                }
            ]
        });

        bot.registerKeyboard('cart_actions', {
            buttons: [
                {
                    text: COMMANDS.DELIVERY,
                    color: 'primary',
                    row: 0
                },
                {
                    text: COMMANDS.CHECKOUT,
                    color: 'positive',
                    row: 0
                },
                {
                    text: COMMANDS.CANCEL,
                    color: 'negative',
                    row: 1
                }
            ]
        });
        console.log('Дополнительные клавиатуры зарегистрированы');
        
        console.log('=== Регистрация команд и клавиатур завершена ===');
    } catch (error) {
        console.error('Ошибка при регистрации команд и клавиатур:', error);
        throw error;
    }
};

// Обработка сообщений
bot.on('message', async (ctx) => {
    // Логируем только нужные поля
    console.log('Текст сообщения:', ctx.message?.text);
    console.log('Payload:', ctx.message?.payload);
    const state = await ctx.getState();
    console.log('Состояние:', state);
    console.log('ID пользователя:', ctx.peerId);

    // Если состояние пустое или undefined, вызываем handleStart
    if (!state) {
        console.log('Состояние пустое, вызываем handleStart');
        await handleStart(ctx);
        return;
    }
    
    // Проверяем payload
    if (ctx.message?.payload) {
        let payload = ctx.message.payload;
        
        try {
            // В тестовом режиме payload может прийти как объект или строка
            if (typeof payload === 'string') {
                console.log('Исходный payload (строка):', payload);
                try {
                    payload = JSON.parse(payload);
                } catch (error) {
                    console.error('Ошибка парсинга JSON:', error);
                }
            }

            // Обновляем payload в контексте
            ctx.message.payload = payload;
            console.log('Обработанный payload:', payload);

            // Если это команда add_to_cart, обрабатываем
            if (payload?.command === 'add_to_cart') {
                await handleAddToCart(ctx);
                return;
            }
        } catch (error) {
            console.error('Ошибка обработки payload:', error);
            return;
        }
    }

    // Получаем текст сообщения
    const text = (ctx.message?.text || '').toLowerCase();

    // Проверяем команды
    switch(text) {
        case COMMANDS.START:
            await handleStart(ctx);
            break;
        case COMMANDS.HELP:
            await handleHelp(ctx);
            break;
        case COMMANDS.DELIVERY:
            await handleDelivery(ctx);
            break;
        case COMMANDS.CANCEL:
            await handleCancel(ctx);
            break;
        case COMMANDS.CHECKOUT:
            await handleCheckout(ctx);
            break;
        case COMMANDS.BACK:
            // Возвращаемся на шаг назад в зависимости от текущего состояния
            const state = await ctx.getState();
            if (state === 'categories') {
                await handleStart(ctx);
            } else if (state.startsWith('pizza_selection:')) {
                await handleDelivery(ctx);
            } else if (state === 'payment') {
                await handleDelivery(ctx);
            } else {
                await handleStart(ctx);
            }
            break;
        default:
            // Проверяем не является ли текст названием категории
            const categories = await getCategories();
            console.log('Проверка категории. Текст:', text);
            console.log('Доступные категории:', categories.map(c => c.name));
            
            // Проверяем состояние
            const userState = await ctx.getState();
            console.log('Текущее состояние при выборе категории:', userState);
            
            if (userState === 'categories') {
                // Приводим названия к нижнему регистру для сравнения
                const selectedCategory = categories.find(c => 
                    c.name.toLowerCase() === text || // Точное совпадение
                    c.name === text // Совпадение с учетом регистра
                );
                
                if (selectedCategory) {
                    console.log('Найдена категория:', selectedCategory);
                    await handleCategory(ctx, selectedCategory.name);
                    return;
                } else {
                    console.log('Категория не найдена');
                    // Отправляем сообщение о неверной категории
                    await bot.sendText(
                        ctx.peerId,
                        'Извините, такой категории нет. Пожалуйста, выберите категорию из предложенных на клавиатуре.',
                        'categories'
                    );
                }
            }
            
            // Проверяем команду оплаты
            if (text === COMMANDS.PAYMENT && userState === 'payment') {
                console.log('Обработка команды "Перейти к оплате"');
                // Очищаем корзину пользователя
                const cartItems = (await bot.getAllDocuments('cart'))
                    .filter(item => item.userId === ctx.peerId);
                
                console.log('Очистка корзины пользователя...');
                for (const item of cartItems) {
                    await bot.deleteDocument('cart', item._id);
                }
                console.log('Корзина очищена');

                console.log('Отправка сообщения о завершении заказа...');
                await bot.sendText(
                    ctx.peerId,
                    'Спасибо за заказ! Это демо-бот, поэтому оплата не требуется.',
                    'main'
                );
                await ctx.setState('main');
                console.log('Заказ завершен, установлено состояние main');
            }
            // Если неизвестная команда, показываем стартовое меню
            else if (!state) {
                await handleStart(ctx);
            }
    }
});

// Обработчик старта
bot.on('start', async () => {
    console.log('Бот запущен и готов к работе!');
});

// Запуск отладочного веб-интерфейса если он включен
if (config.webInterface.enabled) {
    const debugServer = new DebugServer();
    debugServer.start().then(() => {
        console.log(`Отладочный веб-интерфейс доступен на http://localhost:${config.webInterface.port}`);
    });
}

// Функция инициализации базы данных
const initDatabase = async () => {
    console.log('Инициализация базы данных...');
    
    // Очищаем коллекции с данными о пиццах
    await bot.clearCollection('categories');
    await bot.clearCollection('pizzas');
    
    // НЕ очищаем коллекции с данными пользователей
    // await bot.clearCollection('user_states');
    // await bot.clearCollection('cart');
    
    // Добавляем категории
    const categories = [
        { name: 'Классические', code: 'classic', color: 'primary' },
        { name: 'Острые', code: 'spicy', color: 'negative' },
        { name: 'Вегетарианские', code: 'vegetarian', color: 'positive' }
    ];
    
    for (const category of categories) {
        await bot.addDocument('categories', category);
    }
    
    // Добавляем пиццы
    const pizzas = [
        // Классические пиццы
        {
            name: 'Маргарита',
            description: 'Классическая пицца с томатным соусом и моцареллой',
            price: 499,
            image: 'https://i.imgur.com/kbYoRIJ.jpeg',
            categoryId: 'classic'
        },
        {
            name: 'Четыре сыра',
            description: 'Пицца с моцареллой, горгонзолой, пармезаном и рикоттой',
            price: 649,
            image: 'https://i.imgur.com/qVxqVct.jpeg',
            categoryId: 'classic'
        },
        {
            name: 'Гавайская',
            description: 'Пицца с ветчиной и ананасами',
            price: 599,
            image: 'https://i.imgur.com/YxgxwVX.jpeg',
            categoryId: 'classic'
        },
        
        // Острые пиццы
        {
            name: 'Пепперони',
            description: 'Острая пицца с колбасой пепперони',
            price: 599,
            image: 'https://i.imgur.com/qVxqVct.jpeg',
            categoryId: 'spicy'
        },
        {
            name: 'Дьябло',
            description: 'Острая пицца с халапеньо и острыми колбасками',
            price: 649,
            image: 'https://i.imgur.com/kbYoRIJ.jpeg',
            categoryId: 'spicy'
        },
        {
            name: 'Мексиканская',
            description: 'Острая пицца с перцем чили и кукурузой',
            price: 629,
            image: 'https://i.imgur.com/YxgxwVX.jpeg',
            categoryId: 'spicy'
        },

        // Вегетарианские пиццы
        {
            name: 'Овощная',
            description: 'Пицца с грибами, перцем и томатами',
            price: 549,
            image: 'https://i.imgur.com/YxgxwVX.jpeg',
            categoryId: 'vegetarian'
        },
        {
            name: 'Грибная',
            description: 'Пицца с разными видами грибов',
            price: 579,
            image: 'https://i.imgur.com/kbYoRIJ.jpeg',
            categoryId: 'vegetarian'
        },
        {
            name: 'Средиземноморская',
            description: 'Пицца с оливками, томатами и базиликом',
            price: 599,
            image: 'https://i.imgur.com/qVxqVct.jpeg',
            categoryId: 'vegetarian'
        }
    ];
    
    for (const pizza of pizzas) {
        await bot.addDocument('pizzas', pizza);
    }
    
    console.log('База данных инициализирована');
};

// Инициализация бота и запуск
const start = async () => {
    try {
        // Инициализация бота и ожидание подключения к базе данных
        await bot.init({
            dbUri: config.database.uri
        });

        // Инициализация базы данных с пиццами
        await initDatabase();

        // Регистрация команд и клавиатур
        await registerCommandsAndKeyboards();

        // Запуск бота
        console.log('Запуск бота...');
        bot.start();
    } catch (error) {
        console.error('Ошибка при запуске:', error);
        process.exit(1);
    }
};

// Запускаем бота
start();
