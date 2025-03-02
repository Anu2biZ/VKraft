const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { bot } = require('../lib/index.js');

class DebugServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = new Server(this.server);
        
        this.setupExpress();
        this.setupSocketHandlers();
        this.setupBotHandlers();
    }

    setupExpress() {
        // Раздача статических файлов
        this.app.use(express.static(path.join(__dirname)));
        
        // Главная страница
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'index.html'));
        });
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log('Новое подключение к отладчику');

            // Обработка сообщений от пользователя
            socket.on('user:message', (data) => {
                if (data.mode === 'test') {
                    console.log('Получено сообщение в тестовом режиме:', data.text);
                    
                    // Создаем контекст для тестового режима
                    const testContext = {
                        text: data.text,
                        peerId: 1,
                        senderId: 1,
                        setState: (state) => {
                            console.log('Установка состояния:', state);
                            bot.setState(1, state);
                        },
                        getState: () => {
                            const state = bot.getState(1);
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
                        message: { text: data.text }
                    };

                    // Перехватываем отправку сообщений для тестового режима
                    const originalSendText = bot.sendText;
                    bot.sendText = async (peerId, text) => {
                        console.log('Отправка текста:', text);
                        const keyboard = bot.keyboards.map(btn => ({
                            text: btn.text,
                            color: btn.color
                        }));
                        this.io.emit('bot:message', { 
                            text,
                            keyboard
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

                    try {
                        // Эмулируем получение сообщения ботом
                        console.log('Эмуляция сообщения...');
                        bot.emit('message', testContext);
                        console.log('Сообщение обработано');
                    } catch (error) {
                        console.error('Ошибка при обработке сообщения:', error);
                    }

                    // Восстанавливаем оригинальные методы
                    bot.sendText = originalSendText;
                    bot.sendImg = originalSendImg;
                } else {
                    // В боевом режиме отправляем реальное сообщение через VK API
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
            socket.on('user:button_click', (data) => {
                if (data.mode === 'test') {
                    console.log('Нажатие кнопки в тестовом режиме:', data.text);
                    
                    // Создаем контекст для тестового режима
                    const testContext = {
                        text: data.text,
                        peerId: 1,
                        senderId: 1,
                        setState: (state) => {
                            console.log('Установка состояния:', state);
                            bot.setState(1, state);
                        },
                        getState: () => {
                            const state = bot.getState(1);
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
                        message: { text: data.text }
                    };

                    // Перехватываем отправку сообщений для тестового режима
                    const originalSendText = bot.sendText;
                    bot.sendText = async (peerId, text) => {
                        console.log('Отправка текста:', text);
                        const keyboard = bot.keyboards.map(btn => ({
                            text: btn.text,
                            color: btn.color
                        }));
                        this.io.emit('bot:message', { 
                            text,
                            keyboard
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

                    try {
                        // Эмулируем получение сообщения ботом
                        console.log('Эмуляция нажатия кнопки...');
                        bot.emit('message', testContext);
                        console.log('Кнопка обработана');
                    } catch (error) {
                        console.error('Ошибка при обработке кнопки:', error);
                    }

                    // Восстанавливаем оригинальные методы
                    bot.sendText = originalSendText;
                    bot.sendImg = originalSendImg;
                }
                // В боевом режиме ничего не делаем
            });

            // Изменение режима отладки
            socket.on('debug:mode_change', (data) => {
                console.log(`Режим отладки изменен на: ${data.mode}`);
            });
        });
    }

    setupBotHandlers() {
        // Перехватываем отправку сообщений от бота
        const originalSendText = bot.sendText;
        bot.sendText = async (peerId, text) => {
            await originalSendText.call(bot, peerId, text);
            const keyboard = bot.keyboards.map(btn => ({
                text: btn.text,
                color: btn.color
            }));
            this.io.emit('bot:message', { 
                text,
                keyboard
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

    start(port = 3000) {
        return new Promise((resolve) => {
            this.server.listen(port, () => {
                console.log(`Сервер отладки запущен на порту ${port}`);
                resolve();
            });
        });
    }
}

module.exports = DebugServer;
