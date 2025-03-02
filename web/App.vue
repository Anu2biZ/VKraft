<template>
  <div class="flex h-screen p-8 gap-8 overflow-hidden bg-gray-100">
    <!-- Основная панель с консолью и БД -->
    <div class="w-1/2 bg-white rounded-2xl shadow-lg p-6 flex flex-col">
      <!-- Табы -->
      <div class="flex gap-4 mb-6">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'flex-1 py-3 px-4 rounded-xl text-base font-medium transition-all duration-200',
            activeTab === tab.id 
              ? 'bg-vk-light-blue text-white shadow-md' 
              : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
          ]"
        >
          {{ tab.name }}
        </button>
      </div>

      <!-- Панели -->
      <ConsolePanel 
        v-show="activeTab === 'console'" 
        :messages="consoleMessages"
        @clear="consoleMessages = []" 
      />
      <DatabasePanel v-show="activeTab === 'db'" />
    </div>

    <!-- Чат -->
    <div class="w-1/2 bg-white rounded-2xl shadow-lg flex flex-col">
      <ChatContainer 
        :messages="chatMessages"
        :keyboard="currentKeyboard"
        :connection-status="isConnected"
        @send-message="sendMessage"
        @button-click="handleButtonClick"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { io } from 'socket.io-client'
import ConsolePanel from './components/ConsolePanel.vue'
import DatabasePanel from './components/DatabasePanel.vue'
import ChatContainer from './components/ChatContainer.vue'

// Состояние
const socket = ref(null)
const isConnected = ref(false)
const activeTab = ref('console')
const isCollapsed = ref(false)
const consoleMessages = ref([])
const chatMessages = ref([])
const currentKeyboard = ref([])

const tabs = [
  { id: 'console', name: 'Консоль' },
  { id: 'db', name: 'База данных' }
]

// Методы
const log = (message) => {
  const timestamp = new Date().toLocaleTimeString()
  consoleMessages.value.push(`[${timestamp}] ${message}`)
}

const sendMessage = (text) => {
  if (!text.trim()) return
  
  socket.value.emit('user:message', {
    text,
    mode: 'test'
  })
}

const handleButtonClick = (button) => {
  socket.value.emit('user:button_click', {
    text: button.text,
    mode: 'test'
  })
  log(`Нажата кнопка: ${button.text}`)
}

// Инициализация сокета
onMounted(() => {
  socket.value = io()

  socket.value.on('connect', () => {
    isConnected.value = true
    log('Подключено к серверу отладки')
  })

  socket.value.on('disconnect', () => {
    isConnected.value = false
    log('Отключено от сервера отладки')
  })

  socket.value.on('bot:message', (message) => {
    // Добавляем сообщение в чат
    chatMessages.value.push({
      type: message.isUser ? 'user' : 'bot',
      text: message.text
    })
    
    // Обновляем клавиатуру если она есть
    if (message.keyboard && Array.isArray(message.keyboard)) {
      currentKeyboard.value = message.keyboard;
    } else {
      currentKeyboard.value = [];
    }
    
    log(`${message.isUser ? 'Отправлено' : 'Получено'} сообщение: ${message.text}`)
  })

  socket.value.on('bot:media', (data) => {
    chatMessages.value.push({
      type: 'bot',
      mediaType: data.type,
      mediaUrl: data.url,
      text: data.text,
      mediaDescription: data.description
    })
    
    // Обновляем клавиатуру если она есть
    if (data.keyboard && Array.isArray(data.keyboard)) {
      currentKeyboard.value = data.keyboard;
    }
    
    log(`Получен медиа-контент от бота: ${data.type}`)
  })

  socket.value.on('bot:log', log)
})
</script>
