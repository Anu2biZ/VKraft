class VKBotDebugger {
    constructor() {
        this.socket = io();
        this.mode = 'test';
        this.setupSocketHandlers();
        this.setupUIHandlers();
        this.initializeUI();
    }

    setupSocketHandlers() {
        this.socket.on('connect', () => {
            this.updateConnectionStatus(true);
            this.log('Подключено к серверу отладки');
        });

        this.socket.on('disconnect', () => {
            this.updateConnectionStatus(false);
            this.log('Отключено от сервера отладки');
        });

        this.socket.on('bot:message', (message) => {
            const type = message.isUser ? 'user' : 'bot';
            this.addMessage(type, message.text);
            if (message.keyboard) {
                this.updateKeyboard(message.keyboard);
            }
            this.log(`${message.isUser ? 'Отправлено' : 'Получено'} сообщение: ${message.text}`);
        });

        this.socket.on('bot:media', (data) => {
            this.addMediaMessage('bot', data);
            this.log(`Получен медиа-контент от бота: ${data.type}`);
        });

        this.socket.on('bot:log', (logMessage) => {
            this.log(logMessage);
        });

        // Обработчики событий базы данных
        this.socket.on('db:collections', (collections) => {
            this.updateCollectionsList(collections);
            this.log('Получен список коллекций');
        });

        this.socket.on('db:documents', (data) => {
            this.displayDocuments(data);
            this.log(`Получены документы из коллекции ${data.collection}`);
        });

        this.socket.on('db:error', (error) => {
            this.log(`Ошибка базы данных: ${error}`);
        });
    }

    setupUIHandlers() {
        // Обработчик отправки сообщений
        document.getElementById('sendButton').addEventListener('click', () => {
            this.sendMessage();
        });

        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Обработчики вкладок
        document.getElementById('consoleTab').addEventListener('click', () => {
            this.switchTab('console');
        });

        document.getElementById('dbTab').addEventListener('click', () => {
            this.switchTab('db');
        });

        // Обработчики базы данных
        document.getElementById('refreshDb').addEventListener('click', () => {
            this.refreshCollections();
        });

        document.getElementById('collectionSelect').addEventListener('change', (e) => {
            if (e.target.value) {
                this.loadCollection(e.target.value);
            }
        });

        // Устанавливаем тестовый режим по умолчанию
        this.mode = 'test';

        // Загружаем коллекции при старте
        this.refreshCollections();
    }

    initializeUI() {
        this.updateConnectionStatus(false);
        this.log('Интерфейс отладки инициализирован');
    }

    // Переключение вкладок
    switchTab(tabName) {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.panel').forEach(panel => {
            panel.classList.remove('active');
        });

        document.getElementById(`${tabName}Tab`).classList.add('active');
        document.getElementById(`${tabName}Panel`).classList.add('active');
    }

    // Обновление списка коллекций
    refreshCollections() {
        this.socket.emit('db:get_collections');
    }

    // Обновление выпадающего списка коллекций
    updateCollectionsList(collections) {
        const select = document.getElementById('collectionSelect');
        select.innerHTML = '<option value="">Выберите коллекцию</option>';
        
        collections.forEach(collection => {
            const option = document.createElement('option');
            option.value = collection;
            option.textContent = collection;
            select.appendChild(option);
        });
    }

    // Загрузка документов коллекции
    loadCollection(collectionName) {
        this.socket.emit('db:get_documents', collectionName);
    }

    // Отображение документов
    displayDocuments(data) {
        const dbContent = document.getElementById('dbContent');
        dbContent.innerHTML = JSON.stringify(data.documents, null, 2);
    }

    sendMessage() {
        const input = document.getElementById('messageInput');
        const text = input.value.trim();
        
        if (text) {
            this.socket.emit('user:message', {
                text,
                mode: this.mode
            });
            input.value = '';
        }
    }

    addMessage(type, text) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.textContent = text;
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    addMediaMessage(type, data) {
        const messagesContainer = document.getElementById('chatMessages');
        const mediaContainer = document.createElement('div');
        mediaContainer.className = `message ${type} media-message`;

        let mediaElement;
        if (data.type === 'image') {
            mediaElement = document.createElement('img');
            mediaElement.src = data.url;
            mediaElement.alt = data.description || 'Изображение';
        } else if (data.type === 'video') {
            mediaElement = document.createElement('video');
            mediaElement.src = data.url;
            mediaElement.controls = true;
        }

        mediaContainer.appendChild(mediaElement);
        messagesContainer.appendChild(mediaContainer);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    updateKeyboard(buttons) {
        const keyboard = document.getElementById('keyboard');
        keyboard.innerHTML = '';

        buttons.forEach(button => {
            const btnElement = document.createElement('button');
            btnElement.className = button.color || 'primary';
            btnElement.textContent = button.text;
            btnElement.addEventListener('click', () => {
                this.socket.emit('user:button_click', {
                    text: button.text,
                    mode: this.mode
                });
                this.log(`Нажата кнопка: ${button.text}`);
            });
            keyboard.appendChild(btnElement);
        });
    }

    updateConnectionStatus(isConnected) {
        const indicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        
        indicator.className = isConnected ? 'status-online' : 'status-offline';
        statusText.textContent = isConnected ? 'Онлайн' : 'Офлайн';
    }

    log(message) {
        const console = document.getElementById('consoleOutput');
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.textContent = `[${timestamp}] ${message}`;
        console.appendChild(logEntry);
        console.scrollTop = console.scrollHeight;
    }
}

// Инициализация отладчика при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
    window.debugger = new VKBotDebugger();
});
