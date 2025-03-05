<template>
  <div class="payload-helper bg-gray-800 p-4 rounded-lg shadow-lg">
    <h3 class="text-lg text-white mb-4">Примеры данных для кнопок</h3>
    
    <div class="grid gap-4">
      <div v-for="(example, index) in examples" :key="index" class="example-card bg-gray-700 p-3 rounded">
        <div class="text-gray-300 mb-2">{{ example.description }}</div>
        <div class="bg-gray-800 p-2 rounded font-mono text-sm text-green-400 whitespace-pre">{{ JSON.stringify(example.payload, null, 2) }}</div>
        <button 
          class="mt-2 text-blue-400 text-sm hover:text-blue-300"
          @click="copyPayload(example.payload)"
        >
          Использовать этот пример
        </button>
      </div>
    </div>

    <div class="mt-4 text-gray-400 text-sm">
      <p class="mb-2">Данные кнопки (payload) - это JSON-объект, который содержит информацию о действии, которое должно произойти при нажатии на кнопку.</p>
      <p>Обязательное поле <span class="text-yellow-400">action</span> определяет тип действия. Остальные поля зависят от типа действия.</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PayloadHelper',
  data() {
    return {
      examples: [
        {
          description: '1. Кнопка выбора товара',
          payload: {
            action: 'select_product',
            product_id: 123,
            category: 'pizza'
          }
        },
        {
          description: '2. Кнопка добавления в корзину',
          payload: {
            action: 'add_to_cart',
            item_id: 456,
            quantity: 1,
            price: 599
          }
        },
        {
          description: '3. Кнопка фильтрации',
          payload: {
            action: 'filter',
            category: 'spicy',
            sort: 'price_asc'
          }
        },
        {
          description: '4. Кнопка навигации',
          payload: {
            action: 'navigate',
            to: 'menu',
            preserve_filters: true
          }
        }
      ]
    }
  },
  methods: {
    copyPayload(payload) {
      // Эмитим событие для родительского компонента
      this.$emit('select-payload', JSON.stringify(payload, null, 2));
    }
  }
}
</script>

<style scoped>
.example-card {
  transition: all 0.2s;
}

.example-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
</style>
