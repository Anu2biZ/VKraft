const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { bot } = require('../lib/index.js');
const config = require('../lib/config');

class DebugServer {
    constructor() {
        // Проверяем, включен ли веб-интерфейс
        if (!config.webInterface.enabled && config.mode === 'production') {
            throw new Error('Веб-интерфейс отключен в production режиме');
        }

        this.app = express();
        this.server = http.createServer(this.app);
        this.io = new Server(this.server, {
            cors: {
                origin: "http://localhost:3000",
                methods: ["GET", "POST"]
            }
        });
        
        this.setupExpress();
        this.setupSocketHandlers();
        this.setupBotHandlers();
    }

    setupExpress() {
        // Раздача статических файлов из web/public
        const publicDir = path.join(__dirname, 'public');
        console.log('Serving static files from:', publicDir);
        this.app.use(express.static(publicDir));

        // Раздача статических файлов из web директории
        this.app.use(express.static(__dirname));
        
        // Главная страница
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'index.html'));
        });

        // Логируем все запросы к статическим файлам
        this.app.use((req, res, next) => {
            console.log('Static file request:', req.url);
            next();
        });
    }

    async getGroupInfo() {
        // Если есть токен, пробуем получить название группы через API
        if (config.vk.token && bot.vk) {
            try {
                const group = await bot.vk.api.groups.getById({});
                return group[0].name;
            } catch (error) {
                console.error('Ошибка при получении информации о группе:', error);
            }
        }
        
        // Если не удалось получить название, используем ID или тестовое название
        return config.vk.groupId ? `Группа #${config.vk.groupId}` : 'Тестовая группа';
    }

    getScriptName() {
        const scriptPath = process.argv[1];
        return scriptPath ? path.basename(scriptPath) : null;
    }

    setupSocketHandlers() {
        this.io.on('connection', async (socket) => {
            console.log('Новое подключение к отладчику');

            // Отправляем информацию о группе и скрипте
            const groupName = await this.getGroupInfo();
            const scriptName = this.getScriptName();
            socket.emit('bot:info', { 
                groupName,
                scriptName
            });

            // Обработка сообщений от пользователя
            socket.on('user:message', async (data) => {
                console.log(`Получено сообщение в режиме ${bot.getMode()}:`, data.text);
                
                if (bot.getMode() === 'development') {
                    
                    // Создаем контекст для режима разработки
                    const testContext = {
                        text: data.text,
                        peerId: 1,
                        senderId: 1,
                        setState: async (state) => {
                            console.log('Установка состояния:', state);
                            return await bot.setState(1, state);
                        },
                        getState: async () => {
                            const state = await bot.getState(1);
                            console.log('Текущее состояние:', state);
                            return state;
                        },
                        setUserData: (key, value) => {
                            console.log('Сохранение данных:', key, value);
                            bot.setUserData(1, key, value);
                        },
                        getUserData: (key) => {
                            const data = bot.getUserData(1, key);
                            console.log('Получение данных:', key, data);
                            return data;
                        },
                        message: { 
                            text: data.text,
                            payload: data.payload
                        }
                    };

                    // Перехватываем отправку сообщений для режима разработки
                    const originalSendText = bot.sendText;
                    bot.sendText = async (peerId, text, keyboardName = 'main') => {
                        console.log('Отправка текста:', text);
                        const keyboardData = bot.keyboards.get(keyboardName);
                        const keyboard = keyboardData ? keyboardData.buttons.map(btn => ({
                            text: btn.text,
                            color: btn.color,
                            row: btn.row || 0,
                            payload: btn.payload
                        })) : [];
                        this.io.emit('bot:message', { 
                            text,
                            keyboard: this.formatKeyboard(keyboardData?.buttons || [])
                        });
                    };

                    const originalSendImg = bot.sendImg;
                    bot.sendImg = async (peerId, imgUrl) => {
                        console.log('Отправка изображения:', imgUrl);
                        this.io.emit('bot:media', { 
                            type: 'image',
                            url: imgUrl
                        });
                    };

                    const originalSendImgWithText = bot.sendImgWithText;
                    bot.sendImgWithText = async (peerId, text, imgUrl, keyboard = null) => {
                        console.log('Отправка изображения с текстом:', imgUrl);
                        
                        // Отправляем сообщение с изображением
                        const keyboardData = keyboard ? bot.keyboards.get(keyboard) : null;
                        const formattedKeyboard = keyboardData ? this.formatKeyboard(keyboardData.buttons) : [];
                        this.io.emit('bot:media', {
                            type: 'image',
                            url: imgUrl,
                            mediaUrl: imgUrl,
                            text: text,
                            description: text,
                            mediaType: 'image',
                            keyboard: formattedKeyboard
                        });
                    };

                    try {
                        // Отправляем сообщение пользователя в интерфейс
                        this.io.emit('bot:message', {
                            text: data.text,
                            isUser: true
                        });

                        // Эмулируем получение сообщения ботом
                        console.log('Эмуляция сообщения...');
                        await bot.handleMessage(testContext);
                        console.log('Сообщение обработано');
                    } catch (error) {
                        console.error('Ошибка при обработке сообщения:', error);
                    }

                    // Восстанавливаем оригинальные методы
                    bot.sendText = originalSendText;
                    bot.sendImg = originalSendImg;
                    bot.sendImgWithText = originalSendImgWithText;
                } else if (bot.getMode() === 'production') {
                    // В production режиме отправляем реальное сообщение через VK API
                    bot.emit('message', {
                        text: data.text,
                        peerId: 1,
                        senderId: 1,
                        setState: (state) => bot.setState(1, state),
                        getState: () => bot.getState(1),
                        setUserData: (key, value) => bot.setUserData(1, key, value),
                        getUserData: (key) => bot.getUserData(1, key),
                        message: { text: data.text }
                    });
                }
            });

            // Обработка нажатий на кнопки
            socket.on('user:button_click', async (data) => {
                if (data.mode === 'test') {
                    console.log('Нажатие кнопки в тестовом режиме:', data);
                    
                    // Создаем контекст для тестового режима
                    const testContext = {
                        text: data.text,
                        peerId: 1,
                        senderId: 1,
                        setState: async (state) => {
                            console.log('Установка состояния:', state);
                            return await bot.setState(1, state);
                        },
                        getState: async () => {
                            const state = await bot.getState(1);
                            console.log('Текущее состояние:', state);
                            return state;
                        },
                        setUserData: (key, value) => {
                            console.log('Сохранение данных:', key, value);
                            bot.setUserData(1, key, value);
                        },
                        getUserData: (key) => {
                            const data = bot.getUserData(1, key);
                            console.log('Получение данных:', key, data);
                            return data;
                        },
                        message: { 
                            text: data.text,
                            payload: data.payload
                        }
                    };

                    // Перехватываем отправку сообщений для тестового режима
                    const originalSendText = bot.sendText;
                    bot.sendText = async (peerId, text, keyboardName = 'main') => {
                        console.log('Отправка текста:', text);
                        const keyboardData = bot.keyboards.get(keyboardName);
                        this.io.emit('bot:message', { 
                            text,
                            keyboard: this.formatKeyboard(keyboardData?.buttons || [])
                        });
                    };

                    const originalSendImg = bot.sendImg;
                    bot.sendImg = async (peerId, imgUrl) => {
                        console.log('Отправка изображения:', imgUrl);
                        this.io.emit('bot:media', { 
                            type: 'image',
                            url: imgUrl
                        });
                    };

                    const originalSendImgWithText = bot.sendImgWithText;
                    bot.sendImgWithText = async (peerId, text, imgUrl, keyboard = null) => {
                        console.log('Отправка изображения с текстом:', imgUrl);
                        
                        // Отправляем сообщение с изображением
                        const keyboardData = keyboard ? bot.keyboards.get(keyboard) : null;
                        const formattedKeyboard = keyboardData ? this.formatKeyboard(keyboardData.buttons) : [];
                        this.io.emit('bot:media', {
                            type: 'image',
                            url: imgUrl,
                            mediaUrl: imgUrl,
                            text: text,
                            description: text,
                            mediaType: 'image',
                            keyboard: formattedKeyboard
                        });
                    };

                    try {
                        // Отправляем нажатие кнопки в интерфейс
                        this.io.emit('bot:message', {
                            text: data.text,
                            isUser: true
                        });

                        // Эмулируем получение сообщения ботом
                        console.log('Эмуляция нажатия кнопки...');
                        await bot.handleMessage(testContext);
                        console.log('Кнопка обработана');
                    } catch (error) {
                        console.error('Ошибка при обработке кнопки:', error);
                    }

                    // Восстанавливаем оригинальные методы
                    bot.sendText = originalSendText;
                    bot.sendImg = originalSendImg;
                    bot.sendImgWithText = originalSendImgWithText;
                }
                // В боевом режиме ничего не делаем
            });

            // Изменение режима отладки
            socket.on('debug:mode_change', (data) => {
                try {
                    bot.setMode(data.mode);
                    console.log(`Режим работы изменен на: ${data.mode}`);
                    socket.emit('debug:mode_changed', { mode: data.mode });
                } catch (error) {
                    console.error('Ошибка при смене режима:', error);
                    socket.emit('debug:error', error.message);
                }
            });

            // Получение списка коллекций
            socket.on('db:get_collections', async () => {
                try {
                    // Ждем инициализации базы данных
                    if (!bot.db) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    const collections = await bot.getCollections();
                    socket.emit('db:collections', collections);
                } catch (error) {
                    console.error('Ошибка получения коллекций:', error);
                    socket.emit('db:error', 'Ошибка получения списка коллекций');
                }
            });

            // Получение содержимого коллекции
            socket.on('db:get_documents', async (collectionName) => {
                try {
                    // Ждем инициализации базы данных
                    if (!bot.db) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    const documents = await bot.getAllDocuments(collectionName);
                    socket.emit('db:documents', {
                        collection: collectionName,
                        documents: documents
                    });
                } catch (error) {
                    console.error('Ошибка получения документов:', error);
                    socket.emit('db:error', `Ошибка получения документов из коллекции ${collectionName}`);
                }
            });

            // Очистка коллекции
            socket.on('db:clear_collection', async (collectionName) => {
                try {
                    await bot.clearCollection(collectionName);
                    socket.emit('db:collection_cleared');
                } catch (error) {
                    console.error('Ошибка очистки коллекции:', error);
                    socket.emit('db:error', `Ошибка очистки коллекции ${collectionName}`);
                }
            });

            // Удаление коллекции
            socket.on('db:delete_collection', async (collectionName) => {
                try {
                    await bot.deleteCollection(collectionName);
                    socket.emit('db:collection_deleted');
                } catch (error) {
                    console.error('Ошибка удаления коллекции:', error);
                    socket.emit('db:error', `Ошибка удаления коллекции ${collectionName}`);
                }
            });
        });
    }

    setupBotHandlers() {
        // Перехватываем отправку сообщений от бота
        const originalSendText = bot.sendText;
        bot.sendText = async (peerId, text, keyboardName = 'main') => {
            await originalSendText.call(bot, peerId, text, keyboardName);
            const keyboardData = bot.keyboards.get(keyboardName);
            this.io.emit('bot:message', { 
                text,
                keyboard: this.formatKeyboard(keyboardData?.buttons || [])
            });
        };

        const originalSendImg = bot.sendImg;
        bot.sendImg = async (peerId, imgUrl) => {
            await originalSendImg.call(bot, peerId, imgUrl);
            this.io.emit('bot:media', { 
                type: 'image',
                url: imgUrl
            });
        };

        const originalSendImgWithText = bot.sendImgWithText;
        bot.sendImgWithText = async (peerId, text, imgUrl, keyboard = null) => {
            await originalSendImgWithText.call(bot, peerId, text, imgUrl, keyboard);
            
            // Отправляем сообщение с изображением
            const keyboardData = keyboard ? bot.keyboards.get(keyboard) : null;
            const formattedKeyboard = keyboardData ? this.formatKeyboard(keyboardData.buttons) : [];
            this.io.emit('bot:media', {
                type: 'image',
                url: imgUrl,
                mediaUrl: imgUrl,
                text: text,
                description: text,
                mediaType: 'image',
                keyboard: formattedKeyboard
            });
        };

        const originalSendVideo = bot.sendVideo;
        bot.sendVideo = async (peerId, videoUrl) => {
            await originalSendVideo.call(bot, videoUrl);
            this.io.emit('bot:media', {
                type: 'video',
                url: videoUrl
            });
        };

        // Перехватываем логи
        bot.logger.on('logging', (info) => {
            this.io.emit('bot:log', info.message);
        });
    }

    formatKeyboard(buttons) {
        // Возвращаем массив с полной информацией о кнопках
        return buttons.map(btn => ({
            text: btn.text,
            color: btn.color,
            row: btn.row || 0,
            payload: btn.payload
        }));
    }

    handleTestMessage(socket, text) {
        // Эмуляция ответа бота в тестовом режиме
        setTimeout(() => {
            socket.emit('bot:message', {
                text: `Тестовый ответ на: ${text}`,
                keyboard: [
                    { text: 'Ответ 1', color: 'primary' },
                    { text: 'Ответ 2', color: 'secondary' },
                    { text: 'Отмена', color: 'negative' }
                ]
            });
        }, 500);
    }

    handleTestButtonClick(socket, buttonText) {
        // Эмуляция ответа на нажатие кнопки в тестовом режиме
        setTimeout(() => {
            socket.emit('bot:message', {
                text: `Нажата кнопка: ${buttonText}`
            });
        }, 300);
    }

    start(port = config.webInterface.port) {
        return new Promise((resolve) => {
            this.server.listen(port, () => {
                console.log(`Сервер отладки запущен на порту ${port}`);
                resolve();
            });
        });
    }
}

module.exports = DebugServer;
