<template>
  <div class="flex-1 flex flex-col">
    <h3 class="text-lg font-medium mb-3">Консоль</h3>
    <div 
      ref="consoleOutput"
      class="flex-1 bg-gray-900 rounded p-2.5 overflow-y-auto font-mono text-xs text-white whitespace-pre-wrap"
    >
      <div v-for="(message, index) in messages" :key="index">
        {{ message }}
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

const consoleOutput = ref(null)

// Автопрокрутка при новых сообщениях
watch(() => props.messages.length, () => {
  if (!consoleOutput.value) return
  
  nextTick(() => {
    consoleOutput.value.scrollTop = consoleOutput.value.scrollHeight
  })
}, { flush: 'post' })
</script>
