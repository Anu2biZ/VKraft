<template>
  <div class="flex-1 flex flex-col">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-3">
        <span>База данных</span>
        <span v-if="selectedCollection" class="text-sm text-gray-500 font-normal">
          {{ documents ? documents.length : 0 }} записей
        </span>
      </h3>
      <button 
        @click="refreshCollections"
        class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-2"
      >
        <span class="i-mdi-refresh text-lg"></span>
        Обновить
      </button>
    </div>

    <div class="flex-1 bg-white rounded-xl overflow-hidden flex shadow-inner border border-gray-100">
      <!-- Дерево коллекций -->
      <div class="w-[220px] border-r border-gray-100 overflow-y-auto bg-gray-50">
        <div class="p-3">
          <div 
            v-for="collection in collections" 
            :key="collection"
            @click="selectCollection(collection)"
            :class="[
              'px-3 py-2 rounded-lg cursor-pointer text-sm mb-1 flex items-center gap-2 transition-colors',
              selectedCollection === collection 
                ? 'bg-vk-light-blue text-white shadow-sm' 
                : 'text-gray-700 hover:bg-gray-100'
            ]"
          >
            <span class="text-base">📁</span>
            {{ collection }}
          </div>
        </div>
      </div>

      <!-- Просмотр данных -->
      <div class="flex-1 flex flex-col bg-white">
        <!-- Таблица -->
        <div class="flex-1 overflow-auto">
          <table v-if="documents && documents.length" class="w-full border-collapse">
            <thead>
              <tr class="bg-gray-50 text-sm text-gray-600">
                <th 
                  v-for="field in tableFields" 
                  :key="field"
                  class="px-4 py-3 text-left font-medium border-b border-gray-100 sticky top-0 bg-gray-50"
                >
                  {{ field }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="(doc, idx) in documents" 
                :key="idx"
                class="text-sm border-b border-gray-100 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <td 
                  v-for="field in tableFields" 
                  :key="field"
                  class="px-4 py-3"
                >
                  {{ formatValue(doc[field]) }}
                </td>
              </tr>
            </tbody>
          </table>
          <div 
            v-else-if="selectedCollection" 
            class="p-8 text-base text-gray-500 text-center"
          >
            Нет данных в коллекции
          </div>
          <div 
            v-else 
            class="p-8 text-base text-gray-500 text-center"
          >
            Выберите коллекцию для просмотра данных
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { io } from 'socket.io-client'

const socket = io()
const collections = ref([])
const selectedCollection = ref('')
const documents = ref(null)

// Получаем поля для таблицы из первого документа
const tableFields = computed(() => {
  if (!documents.value?.length) return []
  return Object.keys(documents.value[0])
})

// Форматирование значений для отображения
const formatValue = (value) => {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'object') return JSON.stringify(value)
  return value.toString()
}

// Загрузка списка коллекций
const refreshCollections = () => {
  socket.emit('db:get_collections')
}

// Выбор коллекции
const selectCollection = (collection) => {
  selectedCollection.value = collection
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
  documents.value = null
})

// Загружаем коллекции при монтировании
onMounted(refreshCollections)
</script>
