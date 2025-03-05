const COMMANDS = require('../constants/commands');

// Создание клавиатуры главного меню
function createMainKeyboard(bot) {
    return bot.keyboard('main', [
        [
            { text: COMMANDS.START, color: 'primary' },
            { text: COMMANDS.HELP, color: 'secondary' }
        ]
    ]);
}

// Здесь можно добавить другие клавиатуры

module.exports = {
    createMainKeyboard
};
