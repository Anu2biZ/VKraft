const createMainScene = require('./main');

// Регистрация всех сцен бота
function registerScenes(bot) {
    const scenes = [
        createMainScene(bot)
        // Здесь можно добавить другие сцены
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
