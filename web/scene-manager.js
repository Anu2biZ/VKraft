const fs = require('fs').promises;
const path = require('path');

class SceneManager {
    constructor(projectPath) {
        this.projectPath = projectPath;
    }

    // Получение пути к текущему проекту
    async getCurrentProject() {
        const scriptPath = process.argv[1];
        if (scriptPath) {
            // Получаем имя проекта из пути к скрипту
            const match = scriptPath.match(/projects\/([^/]+)/);
            if (match) {
                return match[1];
            }
        }
        throw new Error('Не удалось определить текущий проект');
    }

    // Загрузка сцен из файлов проекта
    async loadScenes() {
        try {
            const projectName = await this.getCurrentProject();
            const scenesPath = path.join(process.cwd(), 'projects', projectName, 'src', 'scenes');
            
            // Пробуем загрузить сцены из разных источников
            try {
                // Сначала пробуем загрузить из scenes.json
                const scenesJsonPath = path.join(scenesPath, 'scenes.json');
                const content = await fs.readFile(scenesJsonPath, 'utf-8');
                const data = JSON.parse(content);
                console.log('Загружены сцены из scenes.json');
                return data.scenes;
            } catch (err) {
                try {
                    // Затем пробуем из initial-scenes.json
                    const initialScenesPath = path.join(scenesPath, 'initial-scenes.json');
                    const content = await fs.readFile(initialScenesPath, 'utf-8');
                    const data = JSON.parse(content);
                    console.log('Загружены сцены из initial-scenes.json');
                    return data.scenes;
                } catch (err) {
                    console.log('JSON файлы не найдены, загружаем из .js файлов');
                    
                    // Если JSON файлы не найдены, загружаем из .js файлов
                    const files = await fs.readdir(scenesPath);
                    const scenes = [];

                    for (const file of files) {
                        if (file.endsWith('.js') && file !== 'index.js') {
                            const content = await fs.readFile(path.join(scenesPath, file), 'utf-8');
                            scenes.push(this.parseSceneFile(content, file));
                        }
                    }

                    return scenes;
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки сцен:', error);
            throw error;
        }
    }

    // Парсинг файла сцены
    parseSceneFile(content, filename) {
        // Извлекаем имя сцены из имени файла
        const sceneName = path.basename(filename, '.js');
        
        // Ищем сообщение при входе
        const enterMessageMatch = content.match(/await bot\.reply\(ctx,\s*['"`](.*?)['"`]/);
        const enterMessage = enterMessageMatch ? enterMessageMatch[1] : '';

        // Ищем клавиатуру
        const keyboardMatch = content.match(/keyboard\(['"`](.*?)['"`],\s*(\[[\s\S]*?\])/);
        const keyboard = keyboardMatch ? this.parseKeyboard(keyboardMatch[2]) : [];

        // Ищем переходы
        const transitions = this.parseTransitions(content);

        return {
            name: sceneName,
            enterMessage,
            keyboard,
            transitions
        };
    }

    // Парсинг клавиатуры
    parseKeyboard(keyboardStr) {
        try {
            // Безопасная eval для преобразования строки в объект
            const keyboard = eval(`(${keyboardStr})`);
            return Array.isArray(keyboard) ? keyboard : [];
        } catch (error) {
            console.error('Ошибка парсинга клавиатуры:', error);
            return [];
        }
    }

    // Парсинг переходов между сценами
    parseTransitions(content) {
        const transitions = [];
        const enterSceneRegex = /bot\.scenes\.enter\(.*?,\s*['"`](.*?)['"`]/g;
        let match;

        while ((match = enterSceneRegex.exec(content)) !== null) {
            transitions.push({
                targetScene: match[1],
                trigger: 'text', // По умолчанию
                value: '' // Нужно дополнительно парсить условия
            });
        }

        return transitions;
    }

    // Генерация кода сцены
    generateSceneCode(scene) {
        return `
function create${scene.name.charAt(0).toUpperCase() + scene.name.slice(1)}Scene(bot) {
    return {
        name: '${scene.name}',
        async enter(ctx) {
            ${scene.keyboard.length > 0 ? this.generateKeyboardCode(scene.keyboard) : ''}
            await bot.reply(ctx, '${scene.enterMessage}', '${scene.name}');
        },
        async handle(ctx) {
            const text = ctx.message?.text?.toLowerCase();
            ${this.generateTransitionsCode(scene.transitions)}
        }
    };
}

module.exports = create${scene.name.charAt(0).toUpperCase() + scene.name.slice(1)}Scene;
`;
    }

    // Генерация кода клавиатуры
    generateKeyboardCode(keyboard) {
        return `bot.keyboard('${scene.name}', ${JSON.stringify(keyboard, null, 4)});`;
    }

    // Генерация кода переходов
    generateTransitionsCode(transitions) {
        return transitions.map(t => `
            if (${this.generateTransitionCondition(t)}) {
                await bot.scenes.enter(ctx.peerId, '${t.targetScene}', ctx);
                return;
            }
        `).join('\n');
    }

    // Генерация условия перехода
    generateTransitionCondition(transition) {
        switch (transition.trigger) {
            case 'text':
                return `text === '${transition.value}'`;
            case 'command':
                return `text === COMMANDS.${transition.value}`;
            case 'payload':
                return `ctx.message?.payload?.command === '${transition.value}'`;
            default:
                return 'false';
        }
    }

    // Сохранение сцен
    async saveScenes(scenes) {
        try {
            const projectName = await this.getCurrentProject();
            const scenesPath = path.join(process.cwd(), 'projects', projectName, 'src', 'scenes');

            // Создаем директорию если её нет
            await fs.mkdir(scenesPath, { recursive: true });

            // Сохраняем каждую сцену
            for (const scene of scenes) {
                const code = this.generateSceneCode(scene);
                await fs.writeFile(
                    path.join(scenesPath, `${scene.name}.js`),
                    code
                );
            }

            // Обновляем index.js
            await this.updateScenesIndex(scenes, scenesPath);

            return { success: true };
        } catch (error) {
            console.error('Ошибка сохранения сцен:', error);
            return { success: false, error: error.message };
        }
    }

    // Обновление индексного файла сцен
    async updateScenesIndex(scenes, scenesPath) {
        const imports = scenes.map(s => 
            `const create${s.name.charAt(0).toUpperCase() + s.name.slice(1)}Scene = require('./${s.name}');`
        ).join('\n');

        const scenesList = scenes.map(s => 
            `        create${s.name.charAt(0).toUpperCase() + s.name.slice(1)}Scene(bot)`
        ).join(',\n');

        const code = `
${imports}

function registerScenes(bot) {
    const scenes = [
${scenesList}
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
`;

        await fs.writeFile(path.join(scenesPath, 'index.js'), code);
    }
}

module.exports = SceneManager;
