const { VK } = require('vk-io');
const { EventEmitter } = require('events');
const winston = require('winston');

class VKBot extends EventEmitter {
    constructor() {
        super();
        this.vk = null;
        this.keyboards = [];
        this.userStates = new Map();
        this.userData = new Map();
        this.commands = new Map();
        
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

    init(token) {
        if (!token) {
            throw new Error('Token VK не предоставлен');
        }

        this.vk = new VK({ token });
        this.logger.info('Бот инициализирован');
        return this;
    }

    // Генерация случайного целого числа для random_id
    generateRandomId() {
        return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    }

    // Создание клавиатуры в формате VK API
    createKeyboard() {
        const buttons = [];
        const row = [];

        // Создаем кнопки
        for (const btn of this.keyboards) {
            row.push({
                action: {
                    type: 'text',
                    label: btn.text
                },
                color: btn.color
            });
        }

        // Добавляем ряд кнопок
        buttons.push(row);

        // Формируем клавиатуру
        const keyboard = {
            one_time: false,
            buttons: buttons
        };

        return JSON.stringify(keyboard);
    }

    async sendText(peerId, text, keyboard = true) {
        try {
            await this.vk.api.messages.send({
                peer_id: peerId,
                message: text,
                random_id: this.generateRandomId(),
                keyboard: keyboard ? this.createKeyboard() : JSON.stringify({buttons: [], one_time: true})
            });
            this.logger.info(`Отправлено сообщение: ${text}`);
        } catch (error) {
            this.logger.error('Ошибка при отправке сообщения:', error);
            throw error;
        }
    }

    async sendImg(peerId, imgUrl, keyboard = true) {
        try {
            await this.vk.api.messages.send({
                peer_id: peerId,
                attachment: imgUrl,
                random_id: this.generateRandomId(),
                keyboard: keyboard ? this.createKeyboard() : JSON.stringify({buttons: [], one_time: true})
            });
            this.logger.info(`Отправлено изображение: ${imgUrl}`);
        } catch (error) {
            this.logger.error('Ошибка при отправке изображения:', error);
            throw error;
        }
    }

    async sendVideo(peerId, videoUrl, keyboard = true) {
        try {
            await this.vk.api.messages.send({
                peer_id: peerId,
                attachment: videoUrl,
                random_id: this.generateRandomId(),
                keyboard: keyboard ? this.createKeyboard() : JSON.stringify({buttons: [], one_time: true})
            });
            this.logger.info(`Отправлено видео: ${videoUrl}`);
        } catch (error) {
            this.logger.error('Ошибка при отправке видео:', error);
            throw error;
        }
    }

    setKeyboards(keyboards) {
        this.keyboards = keyboards.map(keyboard => ({
            ...keyboard,
            color: keyboard.color || 'primary'
        }));
        this.logger.info('Клавиатура обновлена');
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
        if (!this.vk) {
            throw new Error('Бот не инициализирован. Вызовите метод init() перед запуском.');
        }

        // Регистрируем стандартные команды
        this.command('start', async (ctx) => {
            await this.sendText(ctx.peerId, 'Бот запущен и готов к работе!');
        });

        this.logger.info(`Запуск бота. Зарегистрировано команд: ${this.commands.size}`);
        this.logger.info(`Команды: ${Array.from(this.commands.keys()).join(', ')}`);

        try {
            // Настраиваем обработчик сообщений
            this.vk.updates.on('message_new', async (context) => {
                try {
                    // Расширяем контекст
                    context.peerId = context.senderId || context.chatId;
                    context.setState = (state) => this.setState(context.peerId, state);
                    context.getState = () => this.getState(context.peerId);
                    context.setUserData = (key, value) => this.setUserData(context.peerId, key, value);
                    context.getUserData = (key) => this.getUserData(context.peerId, key);
                    
                    const messageText = context.message.text;
                    const payload = context.message.payload ? JSON.parse(context.message.payload) : null;
                    
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
                            await handler(context);
                            this.logger.info(`Команда "${commandText}" выполнена успешно`);
                        } catch (error) {
                            this.logger.error(`Ошибка при выполнении команды "${commandText}":`, error);
                            throw error;
                        }
                    } else {
                        this.logger.info(`Обработчик не найден, обрабатываем как обычное сообщение: "${text}"`);
                        this.emit('message', context);
                    }
                    this.logger.info('=== Конец обработки сообщения ===');
                } catch (error) {
                    this.logger.error('Ошибка при обработке сообщения:', error);
                    throw error;
                }
            });

            await this.vk.updates.start();
            this.logger.info('Бот запущен и слушает обновления');
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
