const createMainScene = require('./main');
const createCategoriesScene = require('./categories');
const createPizzaSelectionScene = require('./pizza-selection');
const createPaymentScene = require('./payment');

// Регистрация всех сцен бота
function registerScenes(bot) {
    const scenes = [
        createMainScene(bot),
        createCategoriesScene(bot),
        createPizzaSelectionScene(bot),
        createPaymentScene(bot)
    ];

    scenes.forEach(scene => {
        bot.scenes.scene(scene.name, {
            enter: scene.enter,
            handle: scene.handle,
            leave: scene.leave || (async () => {})
        });
    });
}

module.exports = registerScenes;
