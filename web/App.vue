<template>
  <div class="flex h-screen p-5 gap-5">
    <!-- Сайдбар с консолью и БД -->
    <div class="w-[300px] bg-white rounded-lg p-4 flex flex-col">
      <!-- Табы -->
      <div class="flex gap-2.5 mb-4">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'flex-1 p-2 rounded border',
            activeTab === tab.id 
              ? 'bg-vk-light-blue text-white border-vk-light-blue' 
              : 'bg-white text-vk-secondary border-vk-border'
          ]"
        >
          {{ tab.name }}
        </button>
      </div>

      <!-- Панели -->
      <ConsolePanel v-show="activeTab === 'console'" :messages="consoleMessages" />
      <DatabasePanel v-show="activeTab === 'db'" />
    </div>

    <!-- Чат -->
    <ChatContainer 
      :messages="chatMessages"
      :keyboard="currentKeyboard"
      :connection-status="isConnected"
      @send-message="sendMessage"
      @button-click="handleButtonClick"
    />
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
      currentKeyboard.value = message.keyboard.map(btn => ({
        text: btn.text,
        color: btn.color || 'primary' // Используем primary как цвет по умолчанию
      }))
    }
    
    log(`${message.isUser ? 'Отправлено' : 'Получено'} сообщение: ${message.text}`)
  })

  socket.value.on('bot:media', (data) => {
    chatMessages.value.push({
      type: 'bot',
      mediaType: data.type,
      mediaUrl: data.url,
      mediaDescription: data.description
    })
    log(`Получен медиа-контент от бота: ${data.type}`)
  })

  socket.value.on('bot:log', log)
})
</script>
