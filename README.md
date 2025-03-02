# VK Bot Build

Фреймворк для создания ботов ВКонтакте с веб-интерфейсом для отладки.

## Возможности

- 🤖 Создание ботов ВКонтакте с поддержкой:
  - Текстовых сообщений
  - Медиа-контента (изображения, видео)
  - Клавиатур с кнопками
  - Пользовательских состояний
  - Пользовательских данных
- 🛠 Веб-интерфейс для отладки с функциями:
  - Эмуляция диалога с ботом
  - Просмотр логов в реальном времени
  - Управление базой данных
  - Тестирование команд и клавиатур
- 📦 MongoDB для хранения данных
- 🔄 Два режима работы:
  - Development (локальная отладка)
  - Production (работа с реальным API ВКонтакте)

## Установка

```bash
# Клонирование репозитория
git clone [url-репозитория]
cd vk-bot-build

# Установка зависимостей
npm install

# Создание конфигурационного файла
cp .env.example .env
```

## Конфигурация

Отредактируйте файл `.env`:

```env
# Режим работы (development/production)
MODE=development

# Токен ВКонтакте
VK_TOKEN=your_token_here

# MongoDB
MONGODB_URI=mongodb://localhost:27017/vk-bot

# Веб-интерфейс
WEB_INTERFACE_ENABLED=true
WEB_INTERFACE_PORT=3000
```

## Запуск

```bash
# Запуск в режиме разработки
npm run dev

# Запуск только веб-интерфейса
npm run dev:web

# Запуск примера эхо-бота
npm run example:echo
```

## Структура проекта

```
vk-bot-build/
├── lib/                  # Основная библиотека
│   ├── index.js         # Основной класс бота
│   ├── config.js        # Конфигурация
│   └── database.js      # Работа с базой данных
├── web/                  # Веб-интерфейс
│   ├── components/      # Vue компоненты
│   ├── App.vue          # Главный компонент
│   ├── main.js          # Точка входа
│   └── server.js        # Сервер для отладки
└── examples/            # Примеры использования
    └── echo-bot.js      # Пример простого бота
```

## Создание бота

### Базовый пример
```javascript
const { bot } = require('../lib/index.js');

// Инициализация бота
await bot.init();

// Регистрация команд
bot.command('start', async (ctx) => {
    await bot.sendText(ctx.peerId, 'Привет! Я тестовый бот.');
});

// Регистрация клавиатуры
bot.registerKeyboard('main', {
    buttons: [
        {
            text: 'Привет',
            color: 'primary',
            row: 0
        },
        {
            text: 'Помощь',
            color: 'secondary',
            row: 0
        }
    ]
});

// Отправка сообщения с клавиатурой
await bot.sendText(peerId, 'Выберите действие:', 'main');

// Запуск бота
await bot.start();
```

### Работа с командами

```javascript
// Регистрация одной команды
bot.command('help', async (ctx) => {
    await bot.sendText(ctx.peerId, 'Справка по командам...');
});

// Регистрация нескольких алиасов для команды
bot.command(['info', 'about'], async (ctx) => {
    await bot.sendText(ctx.peerId, 'Информация о боте...');
});

// Обработка команды с параметрами
bot.command('echo', async (ctx) => {
    const text = ctx.text.replace('echo', '').trim();
    await bot.sendText(ctx.peerId, `Вы сказали: ${text}`);
});
```

### Работа с медиа-контентом

```javascript
// Отправка изображения (поддерживаются как URL, так и локальные файлы)
bot.command('image', async (ctx) => {
    // Использование URL
    await bot.sendImg(ctx.peerId, 'https://example.com/image.jpg');
    
    // Использование локального файла
    await bot.sendImg(ctx.peerId, './images/local-image.jpg');
});

// Отправка видео
bot.command('video', async (ctx) => {
    await bot.sendVideo(ctx.peerId, 'video123_456');
});

// Отправка изображения с текстом и клавиатурой
bot.command('media', async (ctx) => {
    // URL или путь к файлу
    const imageSource = process.env.NODE_ENV === 'production'
        ? 'https://example.com/image.jpg'
        : './images/local-image.jpg';
    
    await bot.sendImgWithText(
        ctx.peerId,
        'Описание изображения',
        imageSource,
        'main' // имя клавиатуры
    );
});
```

#### Поддержка изображений
Бот поддерживает два способа отправки изображений:
1. **URL изображения** - прямая ссылка на изображение в интернете
2. **Локальный файл** - путь к файлу на сервере

В production режиме рекомендуется использовать URL, так как они более надежны и не зависят от структуры файлов на сервере. В development режиме удобно использовать локальные файлы для тестирования.

Пример использования в зависимости от режима:
```javascript
const imageSource = process.env.NODE_ENV === 'production'
    ? 'https://example.com/image.jpg'
    : './images/local-image.jpg';

await bot.sendImg(ctx.peerId, imageSource);
```

### Пример с состояниями

```javascript
bot.command('register', async (ctx) => {
    ctx.setState('waiting_name');
    await bot.sendText(ctx.peerId, 'Как вас зовут?');
});

bot.command('*', async (ctx) => {
    const state = ctx.getState();
    
    if (state === 'waiting_name') {
        ctx.setUserData('name', ctx.text);
        ctx.setState('waiting_age');
        await bot.sendText(ctx.peerId, 'Сколько вам лет?');
    }
    else if (state === 'waiting_age') {
        ctx.setUserData('age', ctx.text);
        ctx.setState(null);
        
        const name = ctx.getUserData('name');
        const age = ctx.getUserData('age');
        
        await bot.sendText(
            ctx.peerId, 
            `Данные сохранены:\nИмя: ${name}\nВозраст: ${age}`
        );
    }
});
```

## Веб-интерфейс

### Структура интерфейса
Веб-интерфейс разделен на две основные панели:

1. **Левая панель** - Инструменты разработчика:
   - Консоль с логами
   - Управление базой данных
   - Переключение режимов работы

2. **Правая панель** - Эмуляция диалога:
   - Чат с ботом
   - Отображение клавиатур
   - Отправка сообщений
   - Индикатор состояния подключения

### Компоненты

#### ChatContainer
Основной компонент для эмуляции диалога с ботом. Поддерживает:
- Отображение сообщений
- Отправку текста
- Отображение клавиатур
- Медиа-контент

### ConsolePanel
Панель для отображения логов в реальном времени.

### DatabasePanel
Интерфейс для работы с MongoDB:
- Просмотр коллекций
- Просмотр документов
- Мониторинг изменений

## Работа с клавиатурой

### Доступные цвета кнопок
- `primary` - Синий (основной цвет)
- `secondary` - Серый (второстепенный)
- `positive` - Зеленый (позитивное действие)
- `negative` - Красный (негативное действие)

### Параметры кнопок
- `text` - Текст кнопки
- `color` - Цвет кнопки
- `row` - Номер строки (начиная с 0)
- `payload` - Дополнительные данные (опционально)

### Пример клавиатуры с разными цветами
```javascript
bot.registerKeyboard('colors', {
    buttons: [
        { text: 'Основная', color: 'primary', row: 0 },
        { text: 'Вторичная', color: 'secondary', row: 0 },
        { text: 'Подтвердить', color: 'positive', row: 1 },
        { text: 'Отменить', color: 'negative', row: 1 }
    ]
});
```

## Работа с состояниями и данными

```javascript
// Установка состояния пользователя
ctx.setState('waiting_name');

// Получение состояния
const state = ctx.getState();

// Сохранение пользовательских данных
ctx.setUserData('name', 'John');

// Получение данных
const name = ctx.getUserData('name');
```

## Отладка

1. Запустите веб-интерфейс:
```bash
npm run dev:web
```

2. Откройте http://localhost:3000

3. Используйте интерфейс для:
- Тестирования команд
- Проверки клавиатур
- Просмотра логов
- Управления базой данных

## Режимы работы

### Development
- Эмуляция работы бота локально
- Все сообщения обрабатываются в веб-интерфейсе
- Не требует токен ВКонтакте

### Production
- Реальная работа с API ВКонтакте
- Требует валидный токен
- Поддерживает все функции API ВК

## Лицензия

MIT
