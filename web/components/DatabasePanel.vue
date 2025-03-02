<template>
  <div class="flex-1 flex flex-col">
    <h3 class="text-lg font-medium mb-3">База данных</h3>
    
    <div class="flex gap-2.5 mb-2.5">
      <select 
        v-model="selectedCollection"
        class="flex-1 p-2 border border-vk-border rounded bg-white"
      >
        <option value="">Выберите коллекцию</option>
        <option 
          v-for="collection in collections" 
          :key="collection" 
          :value="collection"
        >
          {{ collection }}
        </option>
      </select>
      <button 
        @click="refreshCollections"
        class="px-4 py-2 bg-vk-light-blue text-white rounded"
      >
        Обновить
      </button>
    </div>

    <div 
      class="flex-1 bg-gray-900 rounded p-2.5 overflow-y-auto font-mono text-xs text-white whitespace-pre-wrap"
    >
      {{ documents ? JSON.stringify(documents, null, 2) : 'Выберите коллекцию для просмотра данных' }}
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { io } from 'socket.io-client'

const socket = io()
const collections = ref([])
const selectedCollection = ref('')
const documents = ref(null)

// Загрузка списка коллекций
const refreshCollections = () => {
  socket.emit('db:get_collections')
}

// Загрузка документов выбранной коллекции
const loadCollection = (collection) => {
  if (!collection) return
  socket.emit('db:get_documents', collection)
}

// Обработчики событий сокета
socket.on('db:collections', (data) => {
  collections.value = data
})

socket.on('db:documents', (data) => {
  documents.value = data.documents
})

socket.on('db:error', (error) => {
  console.error('Database error:', error)
  documents.value = `Ошибка: ${error}`
})

// Загружаем документы при выборе коллекции
watch(selectedCollection, loadCollection)

// Загружаем коллекции при монтировании
onMounted(refreshCollections)
</script>
