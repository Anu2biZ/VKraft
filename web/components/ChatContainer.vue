<template>
  <div class="h-full bg-white rounded-2xl flex flex-col">
    <!-- Заголовок -->
    <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
      <div class="flex flex-col">
        <h2 class="text-lg font-semibold text-gray-800">{{ groupName }}</h2>
        <div v-if="scriptName" class="text-sm text-gray-600">
          Скрипт: {{ scriptName }}
        </div>
      </div>
      <div class="flex items-center gap-3">
        <span 
          :class="[
            'w-3 h-3 rounded-full',
            connectionStatus ? 'bg-green-500' : 'bg-red-500'
          ]"
        />
        <span class="text-sm text-gray-600 font-medium">
          {{ connectionStatus ? 'Онлайн' : 'Офлайн' }}
        </span>
      </div>
    </div>

    <!-- Сообщения -->
    <div 
      ref="messagesContainer"
      class="flex-1 px-6 py-4 overflow-y-auto flex flex-col gap-4"
    >
      <div
        v-for="(message, index) in messages"
        :key="index"
        :class="[
          'message',
          message.type
        ]"
      >
        <!-- Текстовое сообщение -->
        <template v-if="!message.mediaType">
          {{ message.text }}
        </template>

        <!-- Медиа сообщение -->
        <template v-else>
          <div>
            <div v-if="message.text" class="mb-2">{{ message.text }}</div>
            <div class="max-w-[150px] rounded-lg overflow-hidden">
              <img 
                v-if="message.mediaType === 'image' || message.type === 'image'"
                :src="message.mediaUrl || message.url"
                :alt="message.mediaDescription || message.description"
                class="w-full block"
                @error="handleImageError"
              >
              <div v-if="message.imageError" class="text-red-500">
                Ошибка загрузки изображения: {{ message.url }}
              </div>
              <video
                v-else-if="message.mediaType === 'video'"
                :src="message.mediaUrl"
                controls
                class="w-full block"
              />
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Клавиатура -->
    <div v-if="keyboard && keyboard.length" class="px-6 py-4 border-t border-gray-100">
      <div 
        v-for="(row, rowIndex) in keyboardRows" 
        :key="rowIndex"
        class="flex gap-2 mb-2 last:mb-0"
      >
        <button
          v-for="button in row"
          :key="button.text"
          @click="$emit('button-click', button)"
          :class="[
            'flex-1 px-4 py-3 rounded-xl text-base font-medium transition-colors shadow-sm',
            {
              'bg-vk-light-blue text-white hover:bg-vk-blue': button.color === 'primary',
              'bg-gray-100 text-gray-700 hover:bg-gray-200': button.color === 'secondary',
              'bg-green-500 text-white hover:bg-green-600': button.color === 'positive',
              'bg-red-500 text-white hover:bg-red-600': button.color === 'negative'
            }
          ]"
        >
          {{ button.text }}
        </button>
      </div>
    </div>

    <!-- Поле ввода -->
    <div class="px-6 py-4 border-t border-gray-100 flex gap-3">
      <input
        v-model="messageText"
        @keyup.enter="sendMessage"
        type="text"
        placeholder="Введите сообщение..."
        class="flex-1 px-4 py-3 text-base border border-gray-200 rounded-xl focus:outline-none focus:border-vk-light-blue focus:ring-2 focus:ring-vk-light-blue focus:ring-opacity-20"
      >
      <button
        @click="sendMessage"
        class="px-6 py-3 bg-vk-light-blue text-white text-base font-medium rounded-xl hover:bg-vk-blue transition-colors shadow-sm"
      >
        Отправить
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, computed } from 'vue'

const props = defineProps({
  messages: {
    type: Array,
    required: true
  },
  keyboard: {
    type: Array,
    default: () => []
  },
  connectionStatus: {
    type: Boolean,
    default: false
  },
  groupName: {
    type: String,
    default: 'Тестовая группа'
  },
  scriptName: {
    type: String,
    default: null
  }
})

// Группируем кнопки по строкам
const keyboardRows = computed(() => {
  if (!props.keyboard || !props.keyboard.length) return [];
  
  const rows = {};
  props.keyboard.forEach(btn => {
    const rowIndex = btn.row || 0;
    if (!rows[rowIndex]) {
      rows[rowIndex] = [];
    }
    rows[rowIndex].push(btn);
  });

  return Object.keys(rows)
    .sort((a, b) => Number(a) - Number(b))
    .map(rowIndex => rows[rowIndex]);
})

const emit = defineEmits(['send-message', 'button-click'])

const messageText = ref('')
const messagesContainer = ref(null)

// Обработчик ошибок загрузки изображений
const handleImageError = (event) => {
  const img = event.target
  const message = props.messages.find(m => m.mediaUrl === img.src || m.url === img.src)
  if (message) {
    message.imageError = true
    console.error('Ошибка загрузки изображения:', img.src)
  }
}

// Отправка сообщения
const sendMessage = () => {
  const text = messageText.value.trim()
  if (!text) return

  emit('send-message', text)
  messageText.value = ''
}

// Автопрокрутка при новых сообщениях
watch(() => props.messages.length, () => {
  if (!messagesContainer.value) return

  nextTick(() => {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  })
}, { flush: 'post' })
</script>
