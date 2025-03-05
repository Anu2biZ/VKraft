<template>
  <div class="scene-builder">
    <!-- Панель инструментов -->
    <div class="toolbar bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
      <div>
        <button 
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          @click="addScene"
        >
          Добавить сцену
        </button>
        <button 
          v-if="selectedScene"
          class="ml-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          @click="duplicateScene"
        >
          Дублировать сцену
        </button>
      </div>
      <div>
        <button 
          v-if="selectedScene"
          class="mr-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          @click="deleteScene"
        >
          Удалить
        </button>
        <button 
          class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          @click="saveScenes"
        >
          Сохранить
        </button>
      </div>
    </div>

    <!-- Рабочая область -->
    <div class="workspace flex">
      <!-- Список сцен -->
      <div class="scenes-list w-1/4 bg-gray-900 p-4 border-r border-gray-700">
        <h2 class="text-xl text-white mb-4">Сцены</h2>
        <div 
          v-for="scene in scenes" 
          :key="scene.name"
          class="scene-item bg-gray-800 p-3 mb-2 rounded cursor-pointer hover:bg-gray-700"
          :class="{ 'border-2 border-blue-500': selectedScene === scene }"
          @click="selectScene(scene)"
        >
          {{ scene.name }}
        </div>
      </div>

      <!-- Редактор сцены -->
      <div class="scene-editor w-3/4 p-4" v-if="selectedScene">
        <div class="bg-gray-800 p-4 rounded">
          <h3 class="text-xl text-white mb-4">Редактирование сцены: {{ selectedScene.name }}</h3>
          
          <!-- Основные параметры -->
          <div class="mb-4">
            <label class="block text-gray-300 mb-2">Название сцены</label>
            <input 
              v-model="selectedScene.name"
              class="w-full bg-gray-700 text-white p-2 rounded"
              type="text"
            >
          </div>

          <!-- Сообщение при входе -->
          <div class="mb-4">
            <div class="flex justify-between items-center mb-2">
              <label class="block text-gray-300">Сообщение при входе</label>
              <button 
                class="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-500 text-sm"
                @click="showMessagePreview = !showMessagePreview"
              >
                {{ showMessagePreview ? 'Скрыть предпросмотр' : 'Показать предпросмотр' }}
              </button>
            </div>
            <textarea 
              v-model="selectedScene.enterMessage"
              class="w-full bg-gray-700 text-white p-2 rounded mb-2"
              rows="3"
            ></textarea>
            <!-- Предпросмотр сообщения -->
            <div v-if="showMessagePreview" class="message-preview bg-gray-900 p-4 rounded mb-4">
              <div class="flex items-start">
                <div class="bg-vk-light-blue text-white p-3 rounded-lg max-w-[80%]">
                  {{ selectedScene.enterMessage || 'Пустое сообщение' }}
                </div>
              </div>
            </div>
          </div>

          <!-- Клавиатура -->
          <div class="mb-4">
            <div class="flex justify-between items-center mb-2">
              <label class="block text-gray-300">Клавиатура</label>
              <div class="flex gap-2">
                <button 
                  class="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-500 text-sm"
                  @click="showPayloadHelper = !showPayloadHelper"
                >
                  {{ showPayloadHelper ? 'Скрыть помощь' : 'Помощь по данным' }}
                </button>
                <button 
                  class="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-500 text-sm"
                  @click="showPreview = !showPreview"
                >
                  {{ showPreview ? 'Скрыть предпросмотр' : 'Показать предпросмотр' }}
                </button>
              </div>
            </div>

            <!-- Помощь по payload -->
            <PayloadHelper 
              v-if="showPayloadHelper" 
              class="mb-4"
              @select-payload="applyPayloadExample"
            />

            <!-- Предпросмотр клавиатуры -->
            <div v-if="showPreview" class="keyboard-preview bg-gray-900 p-4 rounded mb-4">
              <div 
                v-for="(row, rowIndex) in selectedScene.keyboard" 
                :key="rowIndex"
                class="flex justify-center gap-2 mb-2"
              >
                <button
                  v-for="(button, buttonIndex) in row"
                  :key="buttonIndex"
                  :class="[
                    'px-4 py-2 rounded text-white',
                    {
                      'bg-blue-500 hover:bg-blue-600': button.color === 'primary',
                      'bg-gray-500 hover:bg-gray-600': button.color === 'secondary',
                      'bg-green-500 hover:bg-green-600': button.color === 'positive',
                      'bg-red-500 hover:bg-red-600': button.color === 'negative'
                    }
                  ]"
                >
                  {{ button.text }}
                </button>
              </div>
            </div>

            <!-- Редактор клавиатуры -->
            <div class="keyboard-builder bg-gray-700 p-4 rounded">
              <div v-for="(row, rowIndex) in selectedScene.keyboard" :key="rowIndex" class="mb-2 keyboard-row">
                <div class="flex overflow-x-auto pb-2">
                  <div 
                    v-for="(button, buttonIndex) in row" 
                    :key="buttonIndex"
                    :class="[
                      'button-editor flex items-center mr-2 flex-shrink-0',
                      { 'ring-2 ring-blue-500': selectedButton === button }
                    ]"
                  >
                    <input 
                      v-model="button.text"
                      class="bg-gray-600 text-white p-2 rounded mr-2 w-32"
                      placeholder="Текст кнопки"
                    >
                    <select 
                      v-model="button.color"
                      class="bg-gray-600 text-white p-2 rounded mr-2 w-28"
                    >
                      <option value="primary">Синий</option>
                      <option value="secondary">Серый</option>
                      <option value="positive">Зеленый</option>
                      <option value="negative">Красный</option>
                    </select>
                    <div class="relative group">
                      <input 
                        v-model="button.payload"
                        class="bg-gray-600 text-white p-2 rounded mr-2 w-48"
                        placeholder="Данные кнопки (JSON)"
                        @blur="validatePayload(button)"
                      >
                      <button 
                        class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                        @click="openPayloadHelper(button)"
                        title="Показать примеры данных"
                      >
                        ?
                      </button>
                    </div>
                    <button 
                      class="bg-red-600 text-white px-2 rounded hover:bg-red-700 flex-shrink-0"
                      @click="removeButton(rowIndex, buttonIndex)"
                    >
                      ×
                    </button>
                  </div>
                  <button 
                    class="bg-blue-600 text-white px-2 rounded hover:bg-blue-700 flex-shrink-0"
                    @click="addButton(rowIndex)"
                  >
                    +
                  </button>
                </div>
              </div>
              <button 
                class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mt-2"
                @click="addKeyboardRow"
              >
                Добавить ряд
              </button>
            </div>
          </div>

          <!-- Переходы -->
          <div class="mb-4">
            <div class="flex justify-between items-center mb-2">
              <label class="block text-gray-300">Переходы в другие сцены</label>
              <button 
                class="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-500 text-sm"
                @click="showTransitionsPreview = !showTransitionsPreview"
              >
                {{ showTransitionsPreview ? 'Скрыть схему' : 'Показать схему' }}
              </button>
            </div>
            <!-- Схема переходов -->
            <div v-if="showTransitionsPreview" class="transitions-preview bg-gray-900 p-4 rounded mb-4">
              <div class="text-white mb-2">Схема переходов из сцены "{{ selectedScene.name }}":</div>
              <div 
                v-for="transition in selectedScene.transitions" 
                :key="transition.value"
                class="flex items-center gap-2 text-gray-300 mb-1"
              >
                <span class="text-white">→</span>
                <span class="text-gray-400">{{ transition.trigger }}:</span>
                <span class="text-yellow-400">"{{ transition.value || '(любой текст)' }}"</span>
                <span class="text-white">→</span>
                <span class="text-green-400">{{ transition.targetScene }}</span>
              </div>
              <div v-if="selectedScene.transitions.length === 0" class="text-gray-500 italic">
                Нет настроенных переходов
              </div>
            </div>
            <div class="transitions bg-gray-700 p-4 rounded">
              <div 
                v-for="(transition, index) in selectedScene.transitions" 
                :key="index"
                class="transition-item flex items-center mb-2"
              >
                <select 
                  v-model="transition.trigger"
                  class="bg-gray-600 text-white p-2 rounded mr-2"
                >
                  <option value="text">По тексту</option>
                  <option value="command">По команде</option>
                  <option value="payload">По данным кнопки</option>
                </select>
                <input 
                  v-model="transition.value"
                  class="bg-gray-600 text-white p-2 rounded mr-2"
                  placeholder="Значение триггера"
                >
                <select 
                  v-model="transition.targetScene"
                  class="bg-gray-600 text-white p-2 rounded mr-2"
                >
                  <option v-for="scene in scenes" :key="scene.name" :value="scene.name">
                    {{ scene.name }}
                  </option>
                </select>
                <button 
                  class="bg-red-600 text-white px-2 rounded hover:bg-red-700"
                  @click="removeTransition(index)"
                >
                  ×
                </button>
              </div>
              <button 
                class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mt-2"
                @click="addTransition"
              >
                Добавить переход
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import PayloadHelper from './PayloadHelper.vue';

export default {
  name: 'SceneBuilder',
  components: {
    PayloadHelper
  },
  data() {
    return {
      scenes: [],
      selectedScene: null,
      buttonColors: {
        primary: 'bg-blue-500',
        secondary: 'bg-gray-500',
        positive: 'bg-green-500',
        negative: 'bg-red-500'
      },
      showPreview: true,
      showMessagePreview: true,
      showTransitionsPreview: true,
      showPayloadHelper: false,
      selectedButton: null
    }
  },
  mounted() {
    // Запрашиваем список сцен при монтировании компонента
    if (this.$root && this.$root.$socket) {
      this.$root.$socket.emit('scenes:get_list');

      // Слушаем события от сервера
      this.$root.$socket.on('scenes:list', (scenes) => {
        this.scenes = scenes;
      });

      this.$root.$socket.on('scenes:save_result', (result) => {
        if (result.success) {
          // Показываем уведомление об успехе
          alert('Сцены успешно сохранены');
        } else {
          // Показываем ошибку
          alert('Ошибка при сохранении сцен: ' + result.error);
        }
      });

      this.$root.$socket.on('scenes:error', (error) => {
        alert('Ошибка: ' + error);
      });
    }
  },
  beforeDestroy() {
    // Отписываемся от событий при уничтожении компонента
    this.$root.$socket.off('scenes:list');
    this.$root.$socket.off('scenes:save_result');
    this.$root.$socket.off('scenes:error');
  },
  methods: {
    addScene() {
      const newScene = {
        name: `scene_${this.scenes.length + 1}`,
        enterMessage: 'Добро пожаловать в сцену',
        keyboard: [[]],
        transitions: []
      };
      this.scenes.push(newScene);
      this.selectScene(newScene);
    },
    duplicateScene() {
      if (!this.selectedScene) return;
      
      const copy = JSON.parse(JSON.stringify(this.selectedScene));
      copy.name = `${copy.name}_copy`;
      
      // Обновляем переходы в копии, чтобы они указывали на правильные сцены
      copy.transitions = copy.transitions.map(t => ({
        ...t,
        targetScene: t.targetScene === this.selectedScene.name ? copy.name : t.targetScene
      }));
      
      this.scenes.push(copy);
      this.selectScene(copy);
    },
    deleteScene() {
      if (!this.selectedScene) return;
      
      if (confirm(`Удалить сцену "${this.selectedScene.name}"?`)) {
        const index = this.scenes.indexOf(this.selectedScene);
        this.scenes.splice(index, 1);
        this.selectedScene = null;
      }
    },
    selectScene(scene) {
      this.selectedScene = scene;
    },
    addKeyboardRow() {
      this.selectedScene.keyboard.push([]);
    },
    addButton(rowIndex) {
      this.selectedScene.keyboard[rowIndex].push({
        text: 'Новая кнопка',
        color: 'primary',
        payload: ''
      });
    },
    validatePayload(button) {
      if (!button.payload) {
        return;
      }
      try {
        // Пробуем распарсить JSON
        const payload = JSON.parse(button.payload);
        // Форматируем обратно для красивого отображения
        button.payload = JSON.stringify(payload, null, 2);
      } catch (error) {
        alert('Некорректный JSON в данных кнопки. Нажмите на "?" рядом с полем, чтобы увидеть примеры.');
        button.payload = '';
      }
    },
    openPayloadHelper(button) {
      this.selectedButton = button;
      this.showPayloadHelper = true;
      // Прокручиваем к выбранной кнопке
      this.$nextTick(() => {
        const buttonEl = button.$el;
        if (buttonEl) {
          buttonEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    },
    applyPayloadExample(payload) {
      if (this.selectedButton) {
        this.selectedButton.payload = payload;
        this.showPayloadHelper = false;
      }
    },
    addTransition() {
      this.selectedScene.transitions.push({
        trigger: 'text',
        value: '',
        targetScene: ''
      });
    },
    removeTransition(index) {
      this.selectedScene.transitions.splice(index, 1);
    },
    removeButton(rowIndex, buttonIndex) {
      this.selectedScene.keyboard[rowIndex].splice(buttonIndex, 1);
      // Удаляем пустой ряд
      if (this.selectedScene.keyboard[rowIndex].length === 0) {
        this.selectedScene.keyboard.splice(rowIndex, 1);
      }
    },
    getButtonColorClass(color) {
      return this.buttonColors[color] || this.buttonColors.primary;
    },
    async saveScenes() {
      try {
        // Проверяем JSON в payload всех кнопок перед сохранением
        for (const scene of this.scenes) {
          for (const row of scene.keyboard) {
            for (const button of row) {
              if (button.payload) {
                try {
                  JSON.parse(button.payload);
                } catch (error) {
                  throw new Error(`Некорректный JSON в данных кнопки "${button.text}" сцены "${scene.name}"`);
                }
              }
            }
          }
        }
        
        // Отправляем сцены на сервер
        if (this.$root && this.$root.$socket) {
          this.$root.$socket.emit('scenes:save', this.scenes);
        } else {
          console.error('Socket not available');
          alert('Ошибка: нет подключения к серверу');
        }
      } catch (error) {
        console.error('Ошибка при сохранении сцен:', error);
        alert(error.message || 'Ошибка при сохранении сцен');
      }
    }
  }
}
</script>

<style scoped>
.scene-builder {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.workspace {
  flex: 1;
  overflow: hidden;
}

.scenes-list {
  overflow-y: auto;
}

.scene-editor {
  overflow-y: auto;
}

.keyboard-row {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 0.5rem;
}

.keyboard-row:last-child {
  border-bottom: none;
}

/* Стилизация скроллбара */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
