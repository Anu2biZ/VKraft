const mongoose = require('mongoose');

class Database {
    constructor(logger) {
        this.logger = logger;
        this.connection = null;
        this.models = new Map();
    }

    async connect(uri = 'mongodb://localhost:27017/vkbot') {
        try {
            this.connection = await mongoose.connect(uri);
            this.logger.info('Подключено к MongoDB');
            return true;
        } catch (error) {
            this.logger.error('Ошибка подключения к MongoDB:', error);
            throw error;
        }
    }

    async disconnect() {
        if (this.connection) {
            await mongoose.disconnect();
            this.logger.info('Отключено от MongoDB');
        }
    }

    // Создание или получение модели коллекции
    getModel(collectionName, schema = {}) {
        if (this.models.has(collectionName)) {
            return this.models.get(collectionName);
        }

        // Создаем схему с поддержкой любых полей
        const dynamicSchema = new mongoose.Schema(schema, { 
            strict: false,
            timestamps: true 
        });

        // Создаем модель
        const model = mongoose.model(collectionName, dynamicSchema);
        this.models.set(collectionName, model);
        return model;
    }

    // Получение списка всех коллекций
    async getCollections() {
        try {
            const collections = await mongoose.connection.db.listCollections().toArray();
            return collections.map(col => col.name);
        } catch (error) {
            this.logger.error('Ошибка получения списка коллекций:', error);
            throw error;
        }
    }

    // Получение всех документов из коллекции
    async getAllDocuments(collectionName) {
        try {
            const model = this.getModel(collectionName);
            return await model.find({});
        } catch (error) {
            this.logger.error(`Ошибка получения документов из коллекции ${collectionName}:`, error);
            throw error;
        }
    }

    // Добавление документа в коллекцию
    async addDocument(collectionName, data) {
        try {
            const model = this.getModel(collectionName);
            const doc = new model(data);
            await doc.save();
            this.logger.info(`Документ добавлен в коллекцию ${collectionName}`);
            return doc;
        } catch (error) {
            this.logger.error(`Ошибка добавления документа в коллекцию ${collectionName}:`, error);
            throw error;
        }
    }

    // Обновление документа
    async updateDocument(collectionName, id, data) {
        try {
            const model = this.getModel(collectionName);
            const doc = await model.findByIdAndUpdate(id, data, { new: true });
            this.logger.info(`Документ ${id} обновлен в коллекции ${collectionName}`);
            return doc;
        } catch (error) {
            this.logger.error(`Ошибка обновления документа в коллекции ${collectionName}:`, error);
            throw error;
        }
    }

    // Удаление документа
    async deleteDocument(collectionName, id) {
        try {
            const model = this.getModel(collectionName);
            await model.findByIdAndDelete(id);
            this.logger.info(`Документ ${id} удален из коллекции ${collectionName}`);
            return true;
        } catch (error) {
            this.logger.error(`Ошибка удаления документа из коллекции ${collectionName}:`, error);
            throw error;
        }
    }

    // Очистка коллекции (удаление всех документов)
    async clearCollection(collectionName) {
        try {
            const model = this.getModel(collectionName);
            await model.deleteMany({});
            this.logger.info(`Коллекция ${collectionName} очищена`);
            return true;
        } catch (error) {
            this.logger.error(`Ошибка очистки коллекции ${collectionName}:`, error);
            throw error;
        }
    }

    // Удаление коллекции
    async deleteCollection(collectionName) {
        try {
            const model = this.getModel(collectionName);
            await model.collection.drop();
            this.models.delete(collectionName);
            this.logger.info(`Коллекция ${collectionName} удалена`);
            return true;
        } catch (error) {
            this.logger.error(`Ошибка удаления коллекции ${collectionName}:`, error);
            throw error;
        }
    }
}

module.exports = Database;
