<template>
  <div class="flex-1 bg-white rounded-lg flex flex-col">
    <!-- Заголовок -->
    <div class="p-4 border-b border-vk-border flex justify-between items-center">
      <h2 class="text-xl font-medium">Тестовый режим бота ВКонтакте</h2>
      <div class="flex items-center gap-2">
        <span 
          :class="[
            'w-2 h-2 rounded-full',
            connectionStatus ? 'bg-green-500' : 'bg-red-500'
          ]"
        />
        <span class="text-sm text-vk-secondary">
          {{ connectionStatus ? 'Онлайн' : 'Офлайн' }}
        </span>
      </div>
    </div>

    <!-- Сообщения -->
    <div 
      ref="messagesContainer"
      class="flex-1 p-4 overflow-y-auto flex flex-col gap-2.5"
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
          <div class="max-w-[300px] rounded-lg overflow-hidden">
            <img 
              v-if="message.mediaType === 'image'"
              :src="message.mediaUrl"
              :alt="message.mediaDescription"
              class="w-full block"
            >
            <video
              v-else-if="message.mediaType === 'video'"
              :src="message.mediaUrl"
              controls
              class="w-full block"
            />
          </div>
        </template>
      </div>
    </div>

    <!-- Клавиатура -->
    <div v-if="keyboard.length" class="p-4 flex flex-wrap gap-2.5">
      <button
        v-for="button in keyboard"
        :key="button.text"
        @click="$emit('button-click', button)"
        class="px-4 py-2 rounded text-sm"
        :class="{
          'bg-vk-light-blue text-white': button.color === 'primary',
          'bg-vk-bg text-vk-text': button.color === 'secondary',
          'bg-green-500 text-white': button.color === 'positive',
          'bg-red-500 text-white': button.color === 'negative'
        }"
      >
        {{ button.text }}
      </button>
    </div>

    <!-- Поле ввода -->
    <div class="p-4 border-t border-vk-border flex gap-2.5">
      <input
        v-model="messageText"
        @keyup.enter="sendMessage"
        type="text"
        placeholder="Введите сообщение..."
        class="flex-1 px-3 py-2 border border-vk-border rounded focus:outline-none focus:border-vk-light-blue"
      >
      <button
        @click="sendMessage"
        class="px-4 py-2 bg-vk-light-blue text-white rounded hover:bg-vk-blue"
      >
        Отправить
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

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
  }
})

const emit = defineEmits(['send-message', 'button-click'])

const messageText = ref('')
const messagesContainer = ref(null)

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
