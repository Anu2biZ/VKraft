const { VK } = require('vk-io');
const { EventEmitter } = require('events');
const winston = require('winston');
const path = require('path');
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

        // В production режиме всегда инициализируем VK клиент
        if (this.mode === 'production') {
            this.vk = new VK({ token });
            // Настраиваем обработчик сообщений VK
            this.vk.updates.on('message_new', async (context) => {
                try {
                    // Расширяем контекст
                    const peerId = context.senderId || context.chatId || context.peerId;
                    context.setState = async (state) => await this.setState(peerId, state);
                    context.getState = async () => await this.getState(peerId);
                    context.setUserData = (key, value) => this.setUserData(peerId, key, value);
                    context.getUserData = (key) => this.getUserData(peerId, key);
                    
                    const messageText = context.text || (context.message && context.message.text);
                    let payload = context.message?.payload;
                    // Если payload строка, пытаемся распарсить
                    if (typeof payload === 'string') {
                        try {
                            payload = JSON.parse(payload);
                        } catch (error) {
                            this.logger.error('Ошибка разбора payload:', error);
                            payload = null;
                        }
                    }
                    
                    if (!messageText) return;

                    const text = messageText.toLowerCase().trim();
                    this.logger.info('=== Обработка сообщения ===');
                    this.logger.info(`Получено сообщение: "${text}"`);
                    this.logger.info(`Payload: ${JSON.stringify(payload)}`);
                    this.logger.info(`Размер Map команд: ${this.commands.size}`);
                    this.logger.info(`Доступные команды: ${Array.from(this.commands.keys()).join(', ')}`);

                    // Если есть payload, передаем его в обработчик сообщений
                    if (payload) {
                        this.logger.info(`Обрабатываем сообщение с payload: ${JSON.stringify(payload)}`);
                        this.emit('message', {
                            ...context,
                            peerId,
                            text: messageText,
                            message: {
                                ...context.message,
                                payload: payload
                            }
                        });
                        return;
                    }

                    // Ищем обработчик команды
                    const commandText = text;
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
            this.logger.info('VK API подключен и слушает обновления');
        }
        
        // Инициализация базы данных
        this.db = new Database(this.logger);
        await this.db.connect(dbUri);
        
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

    // Очистка коллекции
    async clearCollection(collection) {
        if (!this.db) throw new Error('База данных не инициализирована');
        return await this.db.clearCollection(collection);
    }

    // Удаление коллекции
    async deleteCollection(collection) {
        if (!this.db) throw new Error('База данных не инициализирована');
        return await this.db.deleteCollection(collection);
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

    async sendImg(peerId, imgSource, text = '', keyboard = null) {
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
                        random_id: this.generateRandomId(),
                        keyboard: keyboard ? this.createKeyboard(keyboard) : JSON.stringify({buttons: [], one_time: true})
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
                    imgUrl, 
                    text,
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
            // В production режиме отправляем сообщение через VK API
            if (this.mode === 'production' && this.vk) {
                try {
                    // Загружаем изображение
                    const response = await this.uploadImage(imgSource);

                    // Отправляем сообщение с загруженным изображением
                    await this.vk.api.messages.send({
                        peer_id: peerId,
                        message: text,
                        attachment: response.toString(),
                        random_id: this.generateRandomId(),
                        keyboard: keyboard ? this.createKeyboard(keyboard) : JSON.stringify({buttons: [], one_time: true})
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
                const message = {
                    peerId,
                    text,
                    imgUrl,
                    keyboard,
                    type: 'image',
                    mediaType: 'image',
                    mediaUrl: imgUrl,
                    description: text
                };
                
                // Отправляем в веб-интерфейс
                this.emit('bot:media', message);
            }

            this.logger.info(`Отправлено изображение с текстом: ${imgSource}`);
        } catch (error) {
            this.logger.error('Ошибка при отправке изображения с текстом:', error);
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
        return new Promise(async (resolve, reject) => {
            try {
                // Обновляем состояние в памяти
                this.userStates.set(userId, state);
                
                // Получаем текущее состояние из базы данных
                const userStates = await this.getAllDocuments('user_states');
                const existingState = userStates.find(s => s.userId === userId);

                if (existingState) {
                    // Обновляем существующее состояние
                    await this.updateDocument('user_states', existingState._id, {
                        ...existingState,
                        state: state,
                        timestamp: new Date()
                    });
                } else {
                    // Создаем новое состояние
                    await this.addDocument('user_states', {
                        userId: userId,
                        state: state,
                        timestamp: new Date()
                    });
                }

                this.logger.info(`Установлено состояние ${state} для пользователя ${userId}`);
                resolve(state);
            } catch (error) {
                this.logger.error('Ошибка при установке состояния:', error);
                reject(error);
            }
        });
    }

    getState(userId) {
        return new Promise(async (resolve, reject) => {
            try {
                // Сначала проверяем состояние в памяти
                const memoryState = this.userStates.get(userId);
                if (memoryState) {
                    resolve(memoryState);
                    return;
                }

                // Если нет в памяти, получаем из базы данных
                const userStates = await this.getAllDocuments('user_states');
                const userState = userStates.find(s => s.userId === userId);
                
                if (userState) {
                    // Кэшируем состояние в памяти
                    this.userStates.set(userId, userState.state);
                }
                
                resolve(userState ? userState.state : null);
            } catch (error) {
                this.logger.error('Ошибка при получении состояния:', error);
                reject(error);
            }
        });
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
        // Регистрируем стандартные команды
        this.command('start', async (ctx) => {
            await this.sendText(ctx.peerId, 'Бот запущен и готов к работе!');
        });

        this.logger.info(`Запуск бота. Зарегистрировано команд: ${this.commands.size}`);
        this.logger.info(`Команды: ${Array.from(this.commands.keys()).join(', ')}`);
        this.logger.info(`Бот запущен в режиме: ${this.mode}`);
        this.emit('start');
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
