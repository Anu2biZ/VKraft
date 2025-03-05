const { VK } = require('vk-io');
const { EventEmitter } = require('events');
const winston = require('winston');
const Database = require('./database');
const config = require('./config');

// Менеджер сцен для управления состояниями бота
class SceneManager {
    constructor(bot) {
        this.bot = bot;
        this.scenes = new Map();
        this.middlewares = [];
    }

    // Регистрация новой сцены
    scene(name, handlers) {
        const scene = {
            name,
            enter: handlers.enter || (async () => {}),
            leave: handlers.leave || (async () => {}),
            handle: handlers.handle || (async () => {}),
            keyboard: handlers.keyboard
        };
        this.scenes.set(name, scene);
        return this;
    }

    // Добавление middleware для всех сцен
    use(fn) {
        this.middlewares.push(fn);
        return this;
    }

    // Получение текущей сцены пользователя
    async getCurrentScene(userId) {
        const state = await this.bot.getState(userId);
        return this.scenes.get(state);
    }

    // Переход к новой сцене
    async enter(userId, sceneName, ctx) {
        console.log(`Вход в сцену ${sceneName} для пользователя ${userId}`);
        
        const scene = this.scenes.get(sceneName);
        if (!scene) {
            console.error(`Сцена ${sceneName} не найдена`);
            throw new Error(`Сцена ${sceneName} не найдена`);
        }

        const currentScene = await this.getCurrentScene(userId);
        if (currentScene) {
            console.log(`Выход из текущей сцены ${currentScene.name}`);
            await currentScene.leave(ctx);
        }

        console.log(`Установка состояния ${sceneName}`);
        await this.bot.setState(userId, sceneName);
        
        console.log(`Вызов enter для сцены ${sceneName}`);
        await scene.enter(ctx);
        
        console.log(`Успешный вход в сцену ${sceneName}`);
        return scene;
    }

    // Обработка сообщения в текущей сцене
    async handleMessage(ctx) {
        try {
            const scene = await this.getCurrentScene(ctx.peerId);
            if (!scene) {
                console.log('Сцена не найдена для пользователя:', ctx.peerId);
                return false;
            }

            console.log('Обработка сообщения в сцене:', scene.name);

            // Выполняем все middleware
            for (const middleware of this.middlewares) {
                await middleware(ctx);
            }

            await scene.handle(ctx);
            return true;
        } catch (error) {
            console.error('Ошибка при обработке сообщения в сцене:', error);
            return false;
        }
    }
}

// Менеджер команд с поддержкой аргументов и валидации
class CommandManager {
    constructor() {
        this.commands = new Map();
    }

    command(options) {
        const { name, aliases = [], handler, validate } = options;
        
        const commandHandler = async (ctx) => {
            if (validate) {
                const isValid = await validate(ctx);
                if (!isValid) return;
            }
            await handler(ctx);
        };

        [name, ...aliases].forEach(cmd => {
            this.commands.set(cmd.toLowerCase(), commandHandler);
        });
        return this;
    }

    async handleCommand(ctx) {
        const text = ctx.message?.text?.toLowerCase();
        if (!text) return false;

        const handler = this.commands.get(text);
        if (handler) {
            await handler(ctx);
            return true;
        }
        return false;
    }
}

// Основной класс бота
class VKBot extends EventEmitter {
    constructor() {
        super();
        this.vk = null;
        this.keyboards = new Map();
        this.userStates = new Map();
        this.userData = new Map();
        this.db = null;
        this.mode = config.mode;
        
        // Инициализация менеджеров
        this.scenes = new SceneManager(this);
        this.commands = new CommandManager();
        
        // Настройка логгера
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.Console(),
                new winston.transports.File({ filename: 'bot.log' })
            ]
        });
    }

    // Создание клавиатуры в декларативном стиле
    keyboard(name, buttons) {
        return this.registerKeyboard(name, {
            buttons: buttons.map((row, rowIndex) => 
                row.map(btn => ({
                    text: typeof btn === 'string' ? btn : btn.text,
                    color: typeof btn === 'string' ? 'primary' : (btn.color || 'primary'),
                    row: rowIndex,
                    payload: typeof btn === 'string' ? undefined : btn.payload
                })).flat()
            ).flat()
        });
    }

    // Хелпер для создания кнопок
    button(text, options = {}) {
        return {
            text,
            color: options.color || 'primary',
            payload: options.payload
        };
    }

    // Методы для работы с базой данных
    async getDocument(collection, query) {
        const docs = await this.db.getAllDocuments(collection);
        return docs.find(doc => 
            Object.entries(query).every(([key, value]) => doc[key] === value)
        );
    }

    async updateOrCreateDocument(collection, query, data) {
        const doc = await this.getDocument(collection, query);
        if (doc) {
            return await this.db.updateDocument(collection, doc._id, { ...doc, ...data });
        } else {
            return await this.db.addDocument(collection, { ...query, ...data });
        }
    }

    // Методы для работы с коллекциями
    async getCollections() {
        if (!this.db) throw new Error('База данных не инициализирована');
        return await this.db.getCollections();
    }

    // Методы для работы с режимом
    getMode() {
        return this.mode;
    }

    setMode(mode) {
        if (mode !== 'production' && mode !== 'development') {
            throw new Error('Недопустимый режим работы. Используйте "production" или "development"');
        }
        this.mode = mode;
        this.logger.info(`Режим работы изменен на: ${mode}`);
    }

    // Методы для работы с базой данных
    async getAllDocuments(collection) {
        if (!this.db) throw new Error('База данных не инициализирована');
        return await this.db.getAllDocuments(collection);
    }

    async addDocument(collection, data) {
        if (!this.db) throw new Error('База данных не инициализирована');
        return await this.db.addDocument(collection, data);
    }

    async updateDocument(collection, id, data) {
        if (!this.db) throw new Error('База данных не инициализирована');
        return await this.db.updateDocument(collection, id, data);
    }

    async deleteDocument(collection, id) {
        if (!this.db) throw new Error('База данных не инициализирована');
        return await this.db.deleteDocument(collection, id);
    }

    async clearCollection(collection) {
        if (!this.db) throw new Error('База данных не инициализирована');
        return await this.db.clearCollection(collection);
    }

    async deleteCollection(collection) {
        if (!this.db) throw new Error('База данных не инициализирована');
        return await this.db.deleteCollection(collection);
    }

    // Методы для работы с состояниями
    async setState(userId, state) {
        try {
            this.userStates.set(userId, state);
            const userStates = await this.getAllDocuments('user_states');
            const existingState = userStates.find(s => s.userId === userId);

            if (existingState) {
                await this.updateDocument('user_states', existingState._id, {
                    ...existingState,
                    state: state,
                    timestamp: new Date()
                });
            } else {
                await this.addDocument('user_states', {
                    userId: userId,
                    state: state,
                    timestamp: new Date()
                });
            }

            this.logger.info(`Установлено состояние ${state} для пользователя ${userId}`);
            return state;
        } catch (error) {
            this.logger.error('Ошибка при установке состояния:', error);
            throw error;
        }
    }

    async getState(userId) {
        try {
            const memoryState = this.userStates.get(userId);
            if (memoryState) {
                return memoryState;
            }

            const userStates = await this.getAllDocuments('user_states');
            const userState = userStates.find(s => s.userId === userId);
            
            if (userState) {
                this.userStates.set(userId, userState.state);
                return userState.state;
            }
            
            return null;
        } catch (error) {
            this.logger.error('Ошибка при получении состояния:', error);
            throw error;
        }
    }

    // Инициализация бота
    async init(options = {}) {
        const token = options.token || config.vk.token;
        const dbUri = options.dbUri || config.database.uri;

        if (this.mode === 'production' && !token) {
            throw new Error('Token VK не предоставлен в production режиме');
        }

        // В production режиме инициализируем VK клиент
        if (this.mode === 'production') {
            this.vk = new VK({ token });
            this.vk.updates.on('message_new', this.handleMessage.bind(this));
            await this.vk.updates.start();
        }
        
        // Инициализация базы данных
        this.db = new Database(this.logger);
        await this.db.connect(dbUri);
        
        return this;
    }

    // Обработка входящих сообщений
    async handleMessage(ctx) {
        try {
            // В production режиме используем peerId из vk-io MessageContext
            const peerId = this.mode === 'production' ? ctx.peerId : (ctx.senderId || ctx.chatId || ctx.peerId);
            
            // Расширяем контекст методами для работы с состояниями
            if (!ctx.setState) ctx.setState = async (state) => await this.setState(peerId, state);
            if (!ctx.getState) ctx.getState = async () => await this.getState(peerId);
            if (!ctx.setUserData) ctx.setUserData = (key, value) => this.setUserData(peerId, key, value);
            if (!ctx.getUserData) ctx.getUserData = (key) => this.getUserData(peerId, key);

            // Получаем текущее состояние
            const currentState = await this.getState(peerId);
            console.log('Текущее состояние:', currentState);

            // Если нет состояния или команда "начать", устанавливаем начальную сцену
            if (!currentState || ctx.message?.text?.toLowerCase() === 'начать') {
                console.log('Устанавливаем начальную сцену main');
                await this.scenes.enter(peerId, 'main', ctx);
                return;
            }

            // Пробуем обработать как команду
            const isCommand = await this.commands.handleCommand(ctx);
            if (isCommand) return;

            // Пробуем обработать в текущей сцене
            const isHandled = await this.scenes.handleMessage(ctx);
            if (!isHandled) {
                // Если не удалось обработать, эмитим событие
                this.emit('message', ctx);
            }
        } catch (error) {
            this.logger.error('Ошибка при обработке сообщения:', error);
            throw error;
        }
    }

    // Методы для отправки сообщений
    async reply(ctx, text, keyboard = null) {
        return await this.sendText(ctx.peerId, text, keyboard);
    }

    // Создание клавиатуры в формате VK API
    createKeyboard(keyboardName) {
        const buttons = [];
        const keyboardData = this.keyboards.get(keyboardName);
        
        if (!keyboardData) {
            return JSON.stringify({buttons: [], one_time: true});
        }

        // Группируем кнопки по строкам
        const rows = new Map();
        for (const btn of keyboardData.buttons) {
            const rowIndex = btn.row || 0;
            if (!rows.has(rowIndex)) {
                rows.set(rowIndex, []);
            }
            rows.get(rowIndex).push({
                action: {
                    type: 'text',
                    label: btn.text,
                    payload: btn.payload ? JSON.stringify(btn.payload) : undefined
                },
                color: btn.color || 'primary'
            });
        }

        // Формируем строки кнопок в порядке индексов
        const sortedRows = Array.from(rows.entries())
            .sort(([a], [b]) => a - b)
            .map(([_, row]) => row);

        return JSON.stringify({
            one_time: keyboardData.one_time || false,
            buttons: sortedRows
        });
    }

    // Регистрация новой клавиатуры
    registerKeyboard(name, options) {
        if (!name || typeof name !== 'string') {
            throw new Error('Имя клавиатуры должно быть непустой строкой');
        }

        if (!options || !Array.isArray(options.buttons)) {
            throw new Error('Необходимо указать массив кнопок для клавиатуры');
        }

        this.keyboards.set(name, {
            buttons: options.buttons.map(btn => ({
                text: btn.text,
                color: btn.color || 'primary',
                row: btn.row || 0,
                payload: btn.payload
            })),
            one_time: options.one_time || false
        });

        this.logger.info(`Зарегистрирована клавиатура: ${name}`);
        return this;
    }

    // Проверка является ли строка URL
    isUrl(str) {
        try {
            new URL(str);
            return true;
        } catch {
            return false;
        }
    }

    // Загрузка изображения для отправки
    async uploadImage(source) {
        const fs = require('fs');
        const path = require('path');
        const axios = require('axios');

        try {
            if (this.isUrl(source)) {
                // Если это URL, сначала скачиваем изображение
                const response = await axios.get(source, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(response.data, 'binary');
                
                return await this.vk.upload.messagePhoto({
                    source: {
                        value: buffer,
                        filename: 'photo.jpg'
                    }
                });
            } else {
                // Если это путь к файлу, создаем ReadStream
                const absolutePath = path.resolve(process.cwd(), source);
                return await this.vk.upload.messagePhoto({
                    source: {
                        value: fs.createReadStream(absolutePath)
                    }
                });
            }
        } catch (error) {
            this.logger.error('Ошибка при загрузке изображения:', error);
            throw error;
        }
    }

    async sendText(peerId, text, keyboard = null) {
        console.log('Отправка текста:', { peerId, text, keyboard });
        
        if (this.mode === 'production' && this.vk) {
            await this.vk.api.messages.send({
                peer_id: peerId,
                message: text,
                random_id: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
                keyboard: keyboard ? this.createKeyboard(keyboard) : undefined
            });
        }

        const keyboardData = keyboard ? this.keyboards.get(keyboard) : null;
        console.log('Данные клавиатуры:', keyboardData);

        this.emit('message_sent', { 
            peerId, 
            text, 
            keyboard: keyboardData ? keyboardData.buttons : []
        });
    }

    async sendImg(peerId, imgSource, keyboard = null) {
        try {
            if (this.mode === 'production' && this.vk) {
                try {
                    // Загружаем изображение
                    const response = await this.uploadImage(imgSource);

                    // Отправляем сообщение с загруженным изображением
                    await this.vk.api.messages.send({
                        peer_id: peerId,
                        attachment: response.toString(),
                        random_id: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
                        keyboard: keyboard ? this.createKeyboard(keyboard) : undefined
                    });
                } catch (uploadError) {
                    this.logger.error('Ошибка при загрузке изображения:', uploadError);
                    // Если не удалось загрузить изображение, отправляем только текст
                    await this.sendText(peerId, `Изображение: ${imgSource}`, keyboard);
                    return;
                }
            } else {
                // В development режиме формируем правильный URL для локальных файлов
                const imgUrl = this.isUrl(imgSource) 
                    ? imgSource
                    : `http://localhost:${config.webInterface.port}/public/${imgSource}`;
                this.emit('image_sent', { 
                    peerId, 
                    imgUrl, 
                    keyboard,
                    type: 'image'
                });
            }
            this.logger.info(`Отправлено изображение: ${imgSource}`);
        } catch (error) {
            this.logger.error('Ошибка при отправке изображения:', error);
            throw error;
        }
    }

    async sendImgWithText(peerId, text, imgSource, keyboard = null) {
        try {
            if (this.mode === 'production' && this.vk) {
                try {
                    // Загружаем изображение
                    const response = await this.uploadImage(imgSource);

                    // Отправляем сообщение с загруженным изображением
                    await this.vk.api.messages.send({
                        peer_id: peerId,
                        message: text,
                        attachment: response.toString(),
                        random_id: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
                        keyboard: keyboard ? this.createKeyboard(keyboard) : undefined
                    });
                } catch (uploadError) {
                    this.logger.error('Ошибка при загрузке изображения:', uploadError);
                    // Если не удалось загрузить изображение, отправляем только текст
                    await this.sendText(peerId, `${text}\n\nИзображение: ${imgSource}`, keyboard);
                    return;
                }
            } else {
                // В development режиме формируем правильный URL для локальных файлов
                const imgUrl = this.isUrl(imgSource) 
                    ? imgSource 
                    : `http://localhost:${config.webInterface.port}/public/${imgSource}`;
                this.emit('image_sent', { 
                    peerId, 
                    text,
                    imgUrl,
                    keyboard,
                    type: 'image'
                });
            }
            this.logger.info(`Отправлено изображение с текстом: ${imgSource}`);
        } catch (error) {
            this.logger.error('Ошибка при отправке изображения с текстом:', error);
            throw error;
        }
    }

    // Методы для работы с пользовательскими данными
    setUserData(userId, key, value) {
        if (!this.userData.has(userId)) {
            this.userData.set(userId, new Map());
        }
        this.userData.get(userId).set(key, value);
        this.logger.info(`Сохранены данные для пользователя ${userId}: ${key}=${value}`);
    }

    getUserData(userId, key) {
        const userData = this.userData.get(userId);
        return userData ? userData.get(key) : null;
    }

    // Запуск бота
    async start() {
        this.logger.info(`Бот запущен в режиме: ${this.mode}`);
        this.emit('start');
    }
}

// Создаем синглтон
const bot = new VKBot();

module.exports = {
    bot,
    VKBot
};
