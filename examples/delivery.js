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
    CHECKOUT: 'оформить заказ'
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

// Функция инициализации категорий
const initCategories = async () => {
    // Сбрасываем кэш при инициализации
    categoriesCache = null;
    pizzasCache = null;
    console.log('Инициализация категорий...');

    // Очищаем старые категории
    await bot.clearCollection('categories');

    // Добавляем категории
    const defaultCategories = [
        {
            code: 'meat',
            name: 'Мясные',
            color: 'primary'
        },
        {
            code: 'vegetarian',
            name: 'Вегетарианские',
            color: 'positive'
        },
        {
            code: 'spicy',
            name: 'Острые',
            color: 'negative'
        }
    ];

    for (const category of defaultCategories) {
        await bot.addDocument('categories', category);
    }

    return defaultCategories;
};

// Функция инициализации базы данных с пиццами
const initDatabase = async () => {
    console.log('Инициализация базы данных...');

    // Инициализируем категории
    const categories = await initCategories();
    
    // Очищаем старые пиццы
    await bot.clearCollection('pizzas');
    
    // Добавляем пиццы в базу данных
    const defaultPizzas = [
        // Мясные пиццы
        {
            name: 'Пепперони',
            categoryId: 'meat',
            price: 599,
            description: 'Классическая пицца с томатным соусом, сыром моцарелла и пикантной пепперони',
            // В development режиме используем локальные файлы, в production - URL
            image: 'https://img.freepik.com/free-photo/hawaiian-pizza_74190-2500.jpg'
        },
        {
            name: 'Мясная',
            categoryId: 'meat',
            price: 649,
            description: 'Сытная пицца с томатным соусом, моцареллой, беконом, ветчиной и колбасками',
            image: 'https://img.freepik.com/free-photo/hawaiian-pizza_74190-2500.jpg'
        },
        {
            name: 'Гавайская',
            categoryId: 'meat',
            price: 599,
            description: 'Экзотическая пицца с томатным соусом, моцареллой, ветчиной и ананасами',
            image: 'https://img.freepik.com/free-photo/hawaiian-pizza_74190-2500.jpg'
        },
        // Вегетарианские пиццы
        {
            name: 'Маргарита',
            categoryId: 'vegetarian',
            price: 499,
            description: 'Классическая итальянская пицца с томатным соусом, моцареллой и свежим базиликом',
            image: 'https://img.freepik.com/free-photo/pizza-margarita-table_140725-5611.jpg'
        },
        {
            name: 'Грибная',
            categoryId: 'vegetarian',
            price: 549,
            description: 'Ароматная пицца с грибами, моцареллой, луком и итальянскими травами',
            image: 'https://img.freepik.com/free-photo/mushroom-pizza-vegetarian-white-background_123827-20891.jpg'
        },
        {
            name: 'Овощная',
            categoryId: 'vegetarian',
            price: 499,
            description: 'Легкая пицца с томатами, перцем, луком, оливками и свежими травами',
            image: 'https://img.freepik.com/free-photo/vegetarian-pizza-with-mushrooms-bell-peppers_140725-5297.jpg'
        },
        // Острые пиццы
        {
            name: 'Дьябло',
            categoryId: 'spicy',
            price: 649,
            description: 'Острая пицца с салями, перцем халапеньо, красным луком и острым соусом',
            image: 'https://img.freepik.com/free-photo/spicy-pizza-with-chili-peppers_140725-5395.jpg'
        },
        {
            name: 'Мексиканская',
            categoryId: 'spicy',
            price: 629,
            description: 'Острая пицца в мексиканском стиле с фаршем, перцем халапеньо и кукурузой',
            image: 'https://img.freepik.com/free-photo/mexican-pizza-with-beef-chilli_140725-5298.jpg'
        },
        {
            name: 'Острый Чили',
            categoryId: 'spicy',
            price: 599,
            description: 'Жгучая пицца с острым перцем чили, паприкой и специями',
            image: 'https://img.freepik.com/free-photo/pizza-with-chili-peppers-wooden-table_140725-5382.jpg'
        }
    ];

    for (const pizza of defaultPizzas) {
        await bot.addDocument('pizzas', pizza);
    }
};

// Обработчики команд
const handleStart = async (ctx) => {
    console.log('Выполняется команда начать');
    await bot.sendText(
        ctx.peerId,
        'Добро пожаловать в пиццерию! Я помогу вам сделать заказ.',
        'main'
    );
    ctx.setState('main');
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
    console.log('Выполняется команда доставка');
    await bot.sendText(
        ctx.peerId,
        'Выберите категорию пиццы:',
        'categories'
    );
    ctx.setState('categories');
};

const handleCategory = async (ctx, categoryName) => {
    console.log('Выбрана категория:', categoryName);
    
    // Получаем категорию из БД
    const categories = await getCategories();
    const category = categories.find(c => c.name === categoryName);
    
    if (!category) {
        console.error('Категория не найдена:', categoryName);
        return;
    }

    // Получаем пиццы выбранной категории
    const pizzas = await getPizzas();
    console.log('Категория:', category);
    console.log('Код категории:', category.code);
    console.log('Все пиццы:', pizzas);
    const categoryPizzas = pizzas.filter(p => {
        console.log('Сравниваем categoryId пиццы:', p.categoryId, 'с кодом категории:', category.code);
        return p.categoryId === category.code;
    });
    console.log('Отфильтрованные пиццы:', categoryPizzas);
    
    // Сохраняем текущую категорию
    await bot.addDocument('user_states', {
        userId: ctx.peerId,
        categoryId: category.code
    });

    // Отправляем сообщение с пиццами
    await bot.sendText(ctx.peerId, `Доступные пиццы в категории ${category.name}:`, null);
    
    // Отправляем все изображения параллельно
    console.log('Отправка пицц категории:', categoryPizzas);
    await Promise.all(categoryPizzas.map(async pizza => {
        console.log('Отправка пиццы:', pizza.name, pizza.image);
        try {
            await bot.sendImgWithText(
                ctx.peerId,
                `🍕 ${pizza.name}\n📝 ${pizza.description}\n💰 Цена: ${pizza.price} руб.`,
                pizza.image,
                'pizza_actions'
            );
            console.log('Пицца отправлена успешно:', pizza.name);
        } catch (error) {
            console.error('Ошибка при отправке пиццы:', pizza.name, error);
        }
    }));
    
    ctx.setState('pizza_selection');
};

const handlePizzaSelection = async (ctx, pizzaName) => {
    console.log('Выбрана пицца:', pizzaName);
    // Добавляем пиццу в корзину
    const pizza = (await getPizzas()).find(p => p.name === pizzaName);
    if (pizza) {
        await bot.addDocument('cart', {
            userId: ctx.peerId,
            pizza: pizza,
            timestamp: new Date()
        });
        
        await bot.sendText(
            ctx.peerId,
            `Пицца "${pizzaName}" добавлена в корзину!\nХотите добавить что-то еще или оформить заказ?`,
            'cart_actions'
        );
        ctx.setState('cart');
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
    
    await bot.sendText(
        ctx.peerId,
        'Ваш заказ:\n' +
        cartItems.map(item => `- ${item.pizza.name} (${item.pizza.price} руб.)`).join('\n') +
        `\n\nИтого: ${total} руб.\n\nСпасибо за заказ! Это демо-бот, поэтому оплата не требуется.`,
        'main'
    );

    // Очищаем корзину пользователя
    for (const item of cartItems) {
        await bot.deleteDocument('cart', item._id);
    }
    
    ctx.setState('main');
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
    ctx.setState('main');
};

// Функция регистрации команд и клавиатур
const registerCommandsAndKeyboards = async () => {
    console.log('Регистрация команд...');
    bot.command(COMMANDS.START, handleStart);
    bot.command(COMMANDS.HELP, handleHelp);
    bot.command(COMMANDS.DELIVERY, handleDelivery);
    bot.command(COMMANDS.CANCEL, handleCancel);
    bot.command(COMMANDS.CHECKOUT, handleCheckout);

    // Регистрируем категории как команды
    console.log('Регистрация категорий как команд...');
    const categories = await getCategories();
    categories.forEach(category => {
        bot.command(category.name.toLowerCase(), (ctx) => handleCategory(ctx, category.name));
    });

    // Регистрация клавиатур
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

    // Создаем клавиатуру с категориями
    const categoryButtons = categories.map((category, index) => ({
        text: category.name,
        color: category.color,
        row: 0
    }));

    bot.registerKeyboard('categories', {
        buttons: [
            ...categoryButtons,
            {
                text: COMMANDS.BACK,
                color: 'secondary',
                row: 1
            }
        ]
    });

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
};

// Обработка сообщений
bot.on('message', async (ctx) => {
    // Получаем текст сообщения
    const text = (ctx.message?.text || '').toLowerCase();
    console.log('Получено сообщение:', text);

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
            const state = ctx.getState();
            if (state === 'categories') {
                await handleStart(ctx);
            } else if (state === 'pizza_selection') {
                await handleDelivery(ctx);
            }
            break;
        default:
            // Проверяем не является ли текст названием категории
            const categories = await getCategories();
            const selectedCategory = categories.find(c => c.name.toLowerCase() === text);
            if (selectedCategory) {
                await handleCategory(ctx, selectedCategory.name);
                return;
            }
            
            // Проверяем не выбрана ли пицца
            const pizzas = await getPizzas();
            const selectedPizza = pizzas.find(p => p.name.toLowerCase() === text);
            if (selectedPizza) {
                await handlePizzaSelection(ctx, selectedPizza.name);
            } else {
                // Если неизвестная команда, показываем приветствие
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
