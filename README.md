# VK Bot.js

Удобная библиотека для создания ботов ВКонтакте с веб-интерфейсом для отладки.

## Особенности

- 🚀 Простой и интуитивно понятный API
- 🎮 Встроенный веб-интерфейс для отладки
- 💾 Система хранения состояний и данных пользователя
- ⌨️ Удобная работа с клавиатурами
- 📷 Поддержка отправки медиа-контента
- 📝 Подробное логирование

## Установка

```bash
npm install vk-bot.js
```

## Быстрый старт

```javascript
const { bot } = require('vk-bot.js');

// Инициализация с токеном ВК
bot.init('YOUR_VK_TOKEN');

// Обработчик первого взаимодействия
bot.on('start', () => {
    // Создание клавиатуры
    bot.setKeyboards([
        {
            text: 'Привет',
            color: 'primary',
            handler: handleHello
        },
        {
            text: 'Помощь',
            color: 'secondary',
            handler: showHelp
        }
    ]);
    
    bot.sendText('Привет! Я готов к работе!');
});

// Обработчики команд
function handleHello(ctx) {
    bot.sendText('Привет! Как дела?');
    ctx.setState('awaiting_answer');
}

function showHelp(ctx) {
    bot.sendText('Список доступных команд...');
}

// Запуск бота
bot.start();
```

## Веб-интерфейс для отладки

Библиотека включает веб-интерфейс для удобной отладки бота:

1. Импортируйте и инициализируйте отладочный сервер:
```javascript
const DebugServer = require('vk-bot.js/debug');
const debugServer = new DebugServer();
debugServer.start(3000);
```

2. Откройте http://localhost:3000 в браузере

Возможности веб-интерфейса:
- Эмуляция диалога с ботом
- Тестовый и боевой режимы работы
- Отображение клавиатур и обработка нажатий
- Консоль с логами
- Просмотр отправленных медиа-файлов

## API Reference

### Основные методы

#### bot.init(token)
Инициализация бота с токеном ВКонтакте

#### bot.start()
Запуск бота

#### bot.sendText(peerId, text)
Отправка текстового сообщения

#### bot.sendImg(peerId, imageUrl)
Отправка изображения

#### bot.sendVideo(peerId, videoUrl)
Отправка видео

#### bot.setKeyboards(keyboards)
Установка клавиатуры с кнопками

### Работа с состояниями

#### ctx.setState(state)
Установка состояния для пользователя

#### ctx.getState()
Получение текущего состояния пользователя

### Хранение данных

#### ctx.setUserData(key, value)
Сохранение данных пользователя

#### ctx.getUserData(key)
Получение сохраненных данных пользователя

## Цвета клавиатуры

Доступные цвета для кнопок:
- `primary` - синий
- `secondary` - белый
- `negative` - красный
- `positive` - зеленый

## Примеры

### Эхо-бот
```javascript
const { bot } = require('vk-bot.js');

bot.init('TOKEN');

bot.on('message', (ctx) => {
    bot.sendText(ctx.peerId, `Вы написали: ${ctx.message.text}`);
});

bot.start();
```

### Бот с меню
```javascript
const { bot } = require('vk-bot.js');

bot.init('TOKEN');

bot.on('start', () => {
    bot.setKeyboards([
        {
            text: 'Меню 1',
            color: 'primary',
            handler: showMenu1
        },
        {
            text: 'Меню 2',
            color: 'secondary',
            handler: showMenu2
        }
    ]);
});

function showMenu1(ctx) {
    bot.setKeyboards([
        {
            text: 'Подменю 1.1',
            color: 'primary',
            handler: handleSubmenu1
        },
        {
            text: 'Назад',
            color: 'negative',
            handler: backToMain
        }
    ]);
}

bot.start();
```

### Сохранение состояния
```javascript
const { bot } = require('vk-bot.js');

bot.init('TOKEN');

bot.on('message', (ctx) => {
    const state = ctx.getState();
    
    if (state === 'awaiting_name') {
        ctx.setUserData('name', ctx.message.text);
        ctx.setState('awaiting_age');
        bot.sendText(ctx.peerId, 'Теперь введите возраст:');
    }
    else if (state === 'awaiting_age') {
        ctx.setUserData('age', ctx.message.text);
        const name = ctx.getUserData('name');
        bot.sendText(ctx.peerId, `Спасибо! Вас зовут ${name} и вам ${ctx.message.text} лет.`);
    }
});

bot.start();
```

## Отладка

1. Запустите отладочный сервер:
```javascript
const DebugServer = require('vk-bot.js/debug');
const debugServer = new DebugServer();
debugServer.start(3000);
```

2. Откройте веб-интерфейс и используйте:
- Тестовый режим для эмуляции диалога
- Боевой режим для реальной работы с ВК
- Консоль для просмотра логов
- Отправку различных типов сообщений
- Тестирование клавиатур

## Лицензия

MIT
#   V K r a f t  
 