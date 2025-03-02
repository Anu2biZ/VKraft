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

        // Устанавливаем тестовый режим по умолчанию
        this.mode = 'test';
    }

    initializeUI() {
        this.updateConnectionStatus(false);
        this.log('Интерфейс отладки инициализирован');
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
