const { VK } = require('vk-io');
const { EventEmitter } = require('events');
const winston = require('winston');
const Database = require('./database');
const config = require('./config');

class VKBot extends EventEmitter {
    constructor() {
        super();
        this.vk = null;
        this.keyboards = new Map(); // Хранилище для разных клавиатур
        this.userStates = new Map();
        this.userData = new Map();
        this.commands = new Map();
        this.db = null;
        this.mode = config.mode;
        
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

    async init(options = {}) {
        const token = options.token || config.vk.token;
        const dbUri = options.dbUri || config.database.uri;

        if (this.mode === 'production' && !token) {
            throw new Error('Token VK не предоставлен в production режиме');
        }

        if (this.mode === 'production') {
            this.vk = new VK({ token });
        }
        
        // Инициализация базы данных
        this.db = new Database(this.logger);
        if (dbUri) {
            await this.db.connect(dbUri);
        }
        
        this.logger.info(`Бот инициализирован в режиме: ${this.mode}`);
        return this;
    }

    // Получить текущий режим работы
    getMode() {
        return this.mode;
    }

    // Установить режим работы
    setMode(mode) {
        if (mode !== 'production' && mode !== 'development') {
            throw new Error('Недопустимый режим работы. Используйте "production" или "development"');
        }
        this.mode = mode;
        this.logger.info(`Режим работы изменен на: ${mode}`);
    }

    // Методы для работы с базой данных
    async getCollections() {
        if (!this.db) throw new Error('База данных не инициализирована');
        return await this.db.getCollections();
    }

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

    // Генерация случайного целого числа для random_id
    generateRandomId() {
        return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
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

    async sendText(peerId, text, keyboard = null) {
        try {
            if (this.mode === 'production' && this.vk) {
                await this.vk.api.messages.send({
                    peer_id: peerId,
                    message: text,
                    random_id: this.generateRandomId(),
                    keyboard: keyboard ? this.createKeyboard(keyboard) : JSON.stringify({buttons: [], one_time: true})
                });
            }
            this.logger.info(`Отправлено сообщение: ${text}`);
            // Эмитим событие для веб-интерфейса
            this.emit('message_sent', { peerId, text, keyboard });
        } catch (error) {
            this.logger.error('Ошибка при отправке сообщения:', error);
            throw error;
        }
    }

    async sendImg(peerId, imgUrl, keyboard = null) {
        try {
            if (this.mode === 'production' && this.vk) {
                await this.vk.api.messages.send({
                    peer_id: peerId,
                    attachment: imgUrl,
                    random_id: this.generateRandomId(),
                    keyboard: keyboard ? this.createKeyboard(keyboard) : JSON.stringify({buttons: [], one_time: true})
                });
            }
            this.logger.info(`Отправлено изображение: ${imgUrl}`);
            // Эмитим событие для веб-интерфейса
            this.emit('image_sent', { peerId, imgUrl, keyboard });
        } catch (error) {
            this.logger.error('Ошибка при отправке изображения:', error);
            throw error;
        }
    }

    async sendVideo(peerId, videoUrl, keyboard = null) {
        try {
            await this.vk.api.messages.send({
                peer_id: peerId,
                attachment: videoUrl,
                random_id: this.generateRandomId(),
                keyboard: keyboard ? this.createKeyboard(keyboard) : JSON.stringify({buttons: [], one_time: true})
            });
            this.logger.info(`Отправлено видео: ${videoUrl}`);
        } catch (error) {
            this.logger.error('Ошибка при отправке видео:', error);
            throw error;
        }
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

    // Получение списка доступных клавиатур
    getKeyboardsList() {
        return Array.from(this.keyboards.keys());
    }

    // Удаление клавиатуры
    removeKeyboard(name) {
        if (this.keyboards.has(name)) {
            this.keyboards.delete(name);
            this.logger.info(`Удалена клавиатура: ${name}`);
        }
        return this;
    }

    setState(userId, state) {
        this.userStates.set(userId, state);
        this.logger.info(`Установлено состояние ${state} для пользователя ${userId}`);
    }

    getState(userId) {
        return this.userStates.get(userId);
    }

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

    // Регистрация команды
    command(name, handler) {
        if (!handler || typeof handler !== 'function') {
            throw new Error('Обработчик команды должен быть функцией');
        }

        const registerCommand = (cmdName) => {
            if (typeof cmdName !== 'string' || !cmdName.trim()) {
                throw new Error('Имя команды должно быть непустой строкой');
            }
            const lowered = cmdName.toLowerCase().trim();
            this.commands.set(lowered, handler);
            this.logger.info(`Зарегистрирована команда: "${lowered}"`);
        };

        try {
            if (Array.isArray(name)) {
                if (name.length === 0) {
                    throw new Error('Массив команд не может быть пустым');
                }
                name.forEach(registerCommand);
            } else {
                registerCommand(name);
            }
            this.logger.info(`Текущие команды: ${Array.from(this.commands.keys()).join(', ')}`);
        } catch (error) {
            this.logger.error('Ошибка при регистрации команды:', error);
            throw error;
        }
        return this;
    }

    async start() {
        if (this.mode === 'production' && !this.vk) {
            throw new Error('Бот не инициализирован для production режима. Вызовите метод init() с токеном VK.');
        }

        // Регистрируем стандартные команды
        this.command('start', async (ctx) => {
            await this.sendText(ctx.peerId, 'Бот запущен и готов к работе!');
        });

        this.logger.info(`Запуск бота. Зарегистрировано команд: ${this.commands.size}`);
        this.logger.info(`Команды: ${Array.from(this.commands.keys()).join(', ')}`);

        try {
            if (this.mode === 'production' && this.vk) {
                // В production режиме настраиваем обработчик сообщений VK
                this.vk.updates.on('message_new', async (context) => {
                try {
                    // Расширяем контекст
                    const peerId = context.senderId || context.chatId || context.peerId;
                    context.setState = (state) => this.setState(peerId, state);
                    context.getState = () => this.getState(peerId);
                    context.setUserData = (key, value) => this.setUserData(peerId, key, value);
                    context.getUserData = (key) => this.getUserData(peerId, key);
                    
                    const messageText = context.text || (context.message && context.message.text);
                    const payload = context.message && context.message.payload ? JSON.parse(context.message.payload) : null;
                    
                    if (!messageText) return;

                    const text = messageText.toLowerCase().trim();
                    this.logger.info('=== Обработка сообщения ===');
                    this.logger.info(`Получено сообщение: "${text}"`);
                    this.logger.info(`Payload: ${JSON.stringify(payload)}`);
                    this.logger.info(`Размер Map команд: ${this.commands.size}`);
                    this.logger.info(`Доступные команды: ${Array.from(this.commands.keys()).join(', ')}`);

                    // Если есть payload с командой, используем его
                    const commandText = payload?.command?.toLowerCase() || text;
                    this.logger.info(`Ищем команду: "${commandText}"`);

                    const handler = this.commands.get(commandText);
                    if (handler) {
                        this.logger.info(`Найден обработчик для команды: "${commandText}"`);
                        try {
                            this.logger.info(`Выполняем команду: "${commandText}"`);
                            await handler({
                                ...context,
                                peerId,
                                text: messageText
                            });
                            this.logger.info(`Команда "${commandText}" выполнена успешно`);
                        } catch (error) {
                            this.logger.error(`Ошибка при выполнении команды "${commandText}":`, error);
                            throw error;
                        }
                    } else {
                        this.logger.info(`Обработчик не найден, обрабатываем как обычное сообщение: "${text}"`);
                        this.emit('message', {
                            ...context,
                            peerId,
                            text: messageText
                        });
                    }
                    this.logger.info('=== Конец обработки сообщения ===');
                } catch (error) {
                    this.logger.error('Ошибка при обработке сообщения:', error);
                    throw error;
                }
            });

                await this.vk.updates.start();
                this.logger.info('Бот запущен и слушает обновления VK API');
            }
            
            this.logger.info(`Бот запущен в режиме: ${this.mode}`);
            this.emit('start');
        } catch (error) {
            this.logger.error('Ошибка при запуске бота:', error);
            throw error;
        }
    }

    middleware(fn) {
        return async (ctx, next) => {
            try {
                await fn(ctx);
                await next();
            } catch (error) {
                this.logger.error('Ошибка в middleware:', error);
                throw error;
            }
        };
    }
}

// Создаем синглтон для использования
const bot = new VKBot();

module.exports = {
    bot,
    VKBot
};
