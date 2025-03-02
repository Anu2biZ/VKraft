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

// Категории пицц
const CATEGORIES = {
    MEAT: 'Мясные',
    VEGETARIAN: 'Вегетарианские',
    SPICY: 'Острые'
};

// Функция инициализации базы данных с пиццами
const initDatabase = async () => {
    console.log('Инициализация базы данных...');

    // Очищаем старые данные
    const pizzas = await bot.getAllDocuments('pizzas');
    for (const pizza of pizzas) {
        await bot.deleteDocument('pizzas', pizza._id);
    }
    
    // Добавляем пиццы в базу данных
    const defaultPizzas = [
        // Мясные пиццы
        {
            name: 'Пепперони',
            category: CATEGORIES.MEAT,
            price: 599,
            description: 'Классическая пицца с томатным соусом, сыром моцарелла и пикантной пепперони',
            // В development режиме используем локальные файлы, в production - URL
            image: process.env.NODE_ENV === 'production' 
                ? 'https://img.freepik.com/free-photo/pizza-pepperoni-table_140725-5396.jpg'
                : 'pepperoni.jpg'
        },
        {
            name: 'Мясная',
            category: CATEGORIES.MEAT,
            price: 649,
            description: 'Сытная пицца с томатным соусом, моцареллой, беконом, ветчиной и колбасками',
            image: process.env.NODE_ENV === 'production'
                ? 'https://img.freepik.com/free-photo/mixed-pizza-with-various-ingridients_140725-3790.jpg'
                : 'pepperoni.jpg' // Используем то же изображение для примера
        },
        {
            name: 'Гавайская',
            category: CATEGORIES.MEAT,
            price: 599,
            description: 'Экзотическая пицца с томатным соусом, моцареллой, ветчиной и ананасами',
            image: 'https://img.freepik.com/free-photo/hawaiian-pizza_74190-2500.jpg'
        },
        // Вегетарианские пиццы
        {
            name: 'Маргарита',
            category: CATEGORIES.VEGETARIAN,
            price: 499,
            description: 'Классическая итальянская пицца с томатным соусом, моцареллой и свежим базиликом',
            image: 'https://img.freepik.com/free-photo/pizza-margarita-table_140725-5611.jpg'
        },
        {
            name: 'Грибная',
            category: CATEGORIES.VEGETARIAN,
            price: 549,
            description: 'Ароматная пицца с грибами, моцареллой, луком и итальянскими травами',
            image: 'https://img.freepik.com/free-photo/mushroom-pizza-vegetarian-white-background_123827-20891.jpg'
        },
        {
            name: 'Овощная',
            category: CATEGORIES.VEGETARIAN,
            price: 499,
            description: 'Легкая пицца с томатами, перцем, луком, оливками и свежими травами',
            image: 'https://img.freepik.com/free-photo/vegetarian-pizza-with-mushrooms-bell-peppers_140725-5297.jpg'
        },
        // Острые пиццы
        {
            name: 'Дьябло',
            category: CATEGORIES.SPICY,
            price: 649,
            description: 'Острая пицца с салями, перцем халапеньо, красным луком и острым соусом',
            image: 'https://img.freepik.com/free-photo/spicy-pizza-with-chili-peppers_140725-5395.jpg'
        },
        {
            name: 'Мексиканская',
            category: CATEGORIES.SPICY,
            price: 629,
            description: 'Острая пицца в мексиканском стиле с фаршем, перцем халапеньо и кукурузой',
            image: 'https://img.freepik.com/free-photo/mexican-pizza-with-beef-chilli_140725-5298.jpg'
        },
        {
            name: 'Острый Чили',
            category: CATEGORIES.SPICY,
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

const handleCategory = async (ctx, category) => {
    console.log('Выбрана категория:', category);
    // Получаем пиццы выбранной категории
    const pizzas = await bot.getAllDocuments('pizzas');
    const categoryPizzas = pizzas.filter(p => p.category === category);
    
    // Сохраняем текущую категорию
    await bot.addDocument('user_states', {
        userId: ctx.peerId,
        category: category
    });

    // Отправляем сообщение с пиццами
    await bot.sendText(ctx.peerId, `Доступные пиццы в категории ${category}:`, null);
    
    for (const pizza of categoryPizzas) {
        await bot.sendImgWithText(
            ctx.peerId,
            `🍕 ${pizza.name}\n📝 ${pizza.description}\n💰 Цена: ${pizza.price} руб.`,
            pizza.image,
            'pizza_actions'
        );
    }
    
    ctx.setState('pizza_selection');
};

const handlePizzaSelection = async (ctx, pizzaName) => {
    console.log('Выбрана пицца:', pizzaName);
    // Добавляем пиццу в корзину
    const pizza = (await bot.getAllDocuments('pizzas')).find(p => p.name === pizzaName);
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

// Регистрация команд
console.log('Регистрация команд...');
bot.command(COMMANDS.START, handleStart);
bot.command(COMMANDS.HELP, handleHelp);
bot.command(COMMANDS.DELIVERY, handleDelivery);
bot.command(COMMANDS.CANCEL, handleCancel);
bot.command(COMMANDS.CHECKOUT, handleCheckout);

// Регистрируем категории как команды
console.log('Регистрация категорий как команд...');
Object.values(CATEGORIES).forEach(category => {
    bot.command(category.toLowerCase(), (ctx) => handleCategory(ctx, category));
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

bot.registerKeyboard('categories', {
    buttons: [
        {
            text: CATEGORIES.MEAT,
            color: 'primary',
            row: 0
        },
        {
            text: CATEGORIES.VEGETARIAN,
            color: 'positive',
            row: 0
        },
        {
            text: CATEGORIES.SPICY,
            color: 'negative',
            row: 0
        },
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
        case CATEGORIES.MEAT.toLowerCase():
        case CATEGORIES.VEGETARIAN.toLowerCase():
        case CATEGORIES.SPICY.toLowerCase():
            // Находим оригинальную категорию по тексту в нижнем регистре
            const categoryKey = Object.keys(CATEGORIES).find(
                key => CATEGORIES[key].toLowerCase() === text.toLowerCase()
            );
            if (categoryKey) {
                await handleCategory(ctx, CATEGORIES[categoryKey]);
            } else {
                await handleStart(ctx);
            }
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
            // Проверяем не выбрана ли пицца
            const pizzas = await bot.getAllDocuments('pizzas');
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
    await initDatabase();
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
