const COMMANDS = require('../constants/commands');

// Создание клавиатуры главного меню
function createMainKeyboard(bot) {
    return bot.keyboard('main', [
        [
            { text: COMMANDS.DELIVERY, color: 'primary' },
            { text: COMMANDS.HELP, color: 'secondary' }
        ]
    ]);
}

// Создание клавиатуры категорий
function createCategoriesKeyboard(bot, categories, hasCartItems) {
    const buttons = [
        categories.map(category => ({
            text: category.name,
            color: category.color
        })),
        [
            { text: COMMANDS.BACK, color: 'secondary' },
            ...(hasCartItems ? [{ text: COMMANDS.CHECKOUT, color: 'primary' }] : [])
        ]
    ];
    return bot.keyboard('categories', buttons);
}

// Создание клавиатуры выбора пиццы
function createPizzaSelectionKeyboard(bot, category, pizzas) {
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
    return bot.keyboard(`category_${category.code}`, buttons);
}

// Создание клавиатуры оплаты
function createPaymentKeyboard(bot) {
    return bot.keyboard('payment', [
        [
            { text: COMMANDS.BACK, color: 'secondary' },
            { text: COMMANDS.PAYMENT, color: 'positive' }
        ]
    ]);
}

module.exports = {
    createMainKeyboard,
    createCategoriesKeyboard,
    createPizzaSelectionKeyboard,
    createPaymentKeyboard
};
