<template>
  <div class="flex-1 flex flex-col">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-3">
        <span>Консоль</span>
        <span class="text-sm text-gray-500 font-normal">
          {{ messages.length }} сообщений
        </span>
      </h3>
      <button 
        @click="clearConsole"
        class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
      >
        Очистить консоль
      </button>
    </div>
    
    <div class="flex-1 bg-[#1E1E1E] rounded-xl overflow-hidden flex flex-col shadow-inner">
      <!-- Вывод -->
      <div 
        ref="consoleOutput"
        class="flex-1 p-4 overflow-y-auto font-mono text-sm leading-6"
      >
        <div 
          v-for="(message, index) in messages" 
          :key="index"
          class="flex mb-2 last:mb-0"
        >
          <!-- Timestamp -->
          <span class="text-gray-500 mr-3 select-none">
            {{ message.split(']')[0] }}]
          </span>
          <!-- Message -->
          <span 
            class="text-gray-300"
            :class="{
              'text-yellow-400': message.includes('Отправлено'),
              'text-emerald-400': message.includes('Получено'),
              'text-blue-400': message.includes('Подключено'),
              'text-red-400': message.includes('Отключено')
            }"
          >
            {{ message.split(']')[1] }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  messages: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['clear'])
const consoleOutput = ref(null)

// Очистка консоли
const clearConsole = () => {
  emit('clear')
}

// Автопрокрутка при новых сообщениях
watch(() => props.messages.length, () => {
  if (!consoleOutput.value) return
  
  nextTick(() => {
    consoleOutput.value.scrollTop = consoleOutput.value.scrollHeight
  })
}, { flush: 'post' })
</script>
