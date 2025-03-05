# VK Bot Framework

Фреймворк для создания ботов ВКонтакте с веб-интерфейсом для отладки. Позволяет быстро создавать и тестировать ботов с использованием сцен, команд и клавиатур.

## Особенности

- 🚀 Быстрый старт с готовым шаблоном
- 🎮 Веб-интерфейс для отладки
- 📝 Система сцен для управления диалогами
- ⌨️ Удобная работа с клавиатурами
- 🗄️ Встроенная работа с MongoDB
- 🔄 Режимы разработки и продакшена

## Требования к системе

- Node.js 16 или выше
- MongoDB 4.4 или выше
- Git

## Установка

1. Клонируйте репозиторий:
```bash
git clone https://github.com/your-username/vk-bot-build.git
cd vk-bot-build
```

2. Установите зависимости:
```bash
npm install
```

3. Создайте файл .env в корне проекта:
```env
# Режим работы: development или production
NODE_ENV=development

# Токен группы ВКонтакте (для production)
VK_TOKEN=your_token_here
VK_GROUP_ID=your_group_id

# MongoDB
MONGODB_URI=mongodb://localhost:27017/vkbot

# Веб-интерфейс
WEB_INTERFACE_ENABLED=true
WEB_INTERFACE_PORT=3001
```

## Быстрый старт

1. Запустите шаблонный проект в режиме разработки:
```bash
npm run dev:template
```

2. Откройте веб-интерфейс для отладки:
```
http://localhost:3001
```

## Структура проекта

```
vk-bot-build/
├── lib/                    # Ядро фреймворка
│   ├── index.js           # Основной класс бота
│   ├── config.js          # Конфигурация
│   └── database.js        # Работа с БД
├── web/                   # Веб-интерфейс для отладки
├── projects/              # Проекты ботов
│   ├── template/         # Шаблон для нового бота
│   │   ├── src/
│   │   │   ├── scenes/   # Сцены бота
│   │   │   ├── commands/ # Команды
│   │   │   ├── constants/# Константы
│   │   │   └── keyboards/# Клавиатуры
│   │   ├── data/        # Данные и инициализация БД
│   │   └── index.js     # Точка входа
│   └── delivery/        # Пример бота для доставки пиццы
└── package.json
```

## Создание нового бота

1. Скопируйте шаблон:
```bash
cp -r projects/template projects/your-bot-name
```

2. Добавьте скрипты в package.json:
```json
{
  "scripts": {
    "dev:your-bot": "concurrently \"npm run dev:web\" \"cross-env NODE_ENV=development node projects/your-bot-name/index.js\"",
    "prod:your-bot": "cross-env NODE_ENV=production node projects/your-bot-name/index.js",
    "init:your-bot-db": "node projects/your-bot-name/data/init-db.js"
  }
}
```

3. Настройте бота в src/constants/commands.js:
```javascript
const COMMANDS = {
    START: 'начать',
    HELP: 'помощь',
    // Добавьте свои команды
};
```

## Основные концепции

### Визуальный конструктор сцен

Фреймворк включает визуальный конструктор для создания и редактирования сцен бота.

#### Использование конструктора:

1. Убедитесь, что MongoDB запущена (необходима для работы бота)

2. Запустите конструктор сцен:
```bash
npm run scene-builder
```
Это запустит:
- Визуальный конструктор на http://localhost:3000
- Отладочный интерфейс бота на http://localhost:3005

3. В визуальном конструкторе (порт 3000):
   - Создавайте и редактируйте сцены
   - Настраивайте сообщения и клавиатуры
   - Определяйте переходы между сценами
   - Нажмите "Сохранить" для записи сцен в scenes.json

4. В отладочном интерфейсе (порт 3005):
   - Тестируйте работу бота
   - Проверяйте переходы между сценами
   - Отслеживайте состояние корзины
   - Просматривайте данные в MongoDB

5. После завершения редактирования:
   - Закройте конструктор (Ctrl+C в терминале)
   - Запустите бота с новыми сценами:
   ```bash
   npm run dev:delivery
   ```

Теперь бот будет использовать сцены, созданные в конструкторе. Вы можете тестировать логику через веб-интерфейс на порту 3005.

#### Структура сцен

Сцены хранятся в JSON формате в файле `projects/delivery/src/scenes/scenes.json`:
```json
{
  "scenes": [
    {
      "name": "main",
      "enterMessage": "Текст при входе в сцену",
      "keyboard": [
        [
          {
            "text": "Кнопка",
            "color": "primary",
            "payload": {
              "action": "navigate",
              "to": "другая_сцена"
            }
          }
        ]
      ],
      "transitions": [
        {
          "trigger": "payload",
          "value": "{\"action\":\"navigate\",\"to\":\"другая_сцена\"}",
          "targetScene": "другая_сцена"
        }
      ]
    }
  ]
}
```

### Сцены

Сцены - это состояния бота, определяющие его поведение. Каждая сцена имеет:
- enter: функция, вызываемая при входе в сцену
- handle: обработчик сообщений в сцене
- leave: функция, вызываемая при выходе из сцены

```javascript
// src/scenes/example.js
function createExampleScene(bot) {
    return {
        name: 'example',
        async enter(ctx) {
            await bot.reply(ctx, 'Вы вошли в сцену');
        },
        async handle(ctx) {
            await bot.reply(ctx, 'Обработка сообщения');
        }
    };
}
```

### Команды

Команды - это обработчики конкретных текстовых сообщений:

```javascript
bot.commands.command({
    name: 'привет',
    handler: async (ctx) => {
        await bot.reply(ctx, 'Привет!');
    }
});
```

### Клавиатуры

Создание клавиатур для интерактивного взаимодействия:

```javascript
function createKeyboard(bot) {
    return bot.keyboard('main', [
        [
            { text: 'Кнопка 1', color: 'primary' },
            { text: 'Кнопка 2', color: 'secondary' }
        ]
    ]);
}
```

## Веб-интерфейс для отладки

Веб-интерфейс позволяет:
- Тестировать бота без публикации
- Просматривать сообщения и ответы
- Отслеживать состояния и переходы между сценами
- Просматривать данные в базе
- Визуально создавать и редактировать сцены

### Визуальный конструктор сцен

Конструктор сцен позволяет создавать и редактировать сцены бота без написания кода:

- Создание и редактирование сцен с предпросмотром
- Визуальный редактор клавиатур с поддержкой:
  - Текста и цвета кнопок
  - JSON-данных (payload) с примерами:
    ```json
    // Кнопка выбора товара
    {
      "action": "select_product",
      "product_id": 123,
      "category": "pizza"
    }

    // Кнопка добавления в корзину
    {
      "action": "add_to_cart",
      "item_id": 456,
      "quantity": 1
    }

    // Кнопка навигации
    {
      "action": "navigate",
      "to": "menu"
    }
    ```
- Настройка переходов между сценами
- Автоматическая генерация кода

## Режимы работы

### Режим разработки (development)
- Веб-интерфейс для отладки
- Эмуляция API ВКонтакте
- Горячая перезагрузка при изменениях
- Подробное логирование

### Режим продакшена (production)
- Реальное API ВКонтакте
- Оптимизированная работа
- Минимальное логирование

## Пример использования

Смотрите проект delivery для примера полноценного бота с:
- Многоуровневым меню
- Корзиной покупок
- Обработкой платежей
- Работой с изображениями
- Сложной логикой диалогов

## API Reference

### Bot Class

```javascript
const { bot } = require('../../lib/index.js');

// Инициализация
await bot.init({
    dbUri: 'mongodb://localhost:27017/vkbot'
});

// Отправка сообщений
await bot.reply(ctx, 'Текст');
await bot.sendImg(ctx.peerId, 'url/to/image');

// Работа с состояниями
await bot.setState(userId, 'scene_name');
const state = await bot.getState(userId);

// Работа с данными
await bot.addDocument('collection', data);
const docs = await bot.getAllDocuments('collection');
```

### Context Object

В обработчиках доступен объект контекста:
```javascript
{
    peerId: Number,      // ID пользователя/беседы
    message: {           // Информация о сообщении
        text: String,    // Текст сообщения
        payload: Object  // Данные от кнопок
    },
    setState: Function,  // Установка состояния
    getState: Function,  // Получение состояния
    setUserData: Function, // Сохранение данных пользователя
    getUserData: Function  // Получение данных пользователя
}
```

## Отладка

### Логирование

Фреймворк использует winston для логирования. Логи сохраняются в файл bot.log:
```javascript
// Уровни логирования
bot.logger.info('Информационное сообщение');
bot.logger.error('Ошибка', error);
bot.logger.debug('Отладочная информация');
```

### Работа с payload в кнопках

В режиме разработки и продакшена payload обрабатывается по-разному:

```javascript
// Создание кнопки с payload
const button = {
    text: 'Кнопка',
    color: 'primary',
    payload: { 
        command: 'action',
        data: { id: 123 }
    }
};

// Обработка payload
async handle(ctx) {
    let payload = ctx.message?.payload || ctx.messagePayload;
    
    // В development payload приходит как строка
    if (typeof payload === 'string') {
        payload = JSON.parse(payload);
    }
    
    if (payload?.command === 'action') {
        // Обработка команды
    }
}
```

### Отладка базы данных

Для просмотра и редактирования данных в MongoDB можно использовать:
- MongoDB Compass
- Веб-интерфейс фреймворка (вкладка Database)
- Методы бота:
  ```javascript
  // Получить все коллекции
  const collections = await bot.getCollections();
  
  // Получить документы
  const docs = await bot.getAllDocuments('collection');
  
  // Очистить коллекцию
  await bot.clearCollection('collection');
  ```

## Лицензия

MIT
