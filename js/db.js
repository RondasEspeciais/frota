const DB_NAME = 'gestaoFrotaDB';
const DB_VERSION = 6;
let dbInstance = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      const ensureStore = (name, options, indexes = []) => {
        let store;
        if (!db.objectStoreNames.contains(name)) {
          store = db.createObjectStore(name, options);
        } else {
          store = event.target.transaction.objectStore(name);
        }

        indexes.forEach(index => {
          if (!store.indexNames.contains(index.name)) {
            store.createIndex(index.name, index.keyPath, { unique: !!index.unique });
          }
        });
      };

      ensureStore('motoristas', { keyPath: 'id', autoIncrement: true }, [
        { name: 'nome', keyPath: 'nome' },
        { name: 'cnh', keyPath: 'cnh' },
        { name: 'validadeCNH', keyPath: 'validadeCNH' }
      ]);

      ensureStore('viaturas', { keyPath: 'id', autoIncrement: true }, [
        { name: 'placa', keyPath: 'placa' },
        { name: 'modelo', keyPath: 'modelo' }
      ]);

      ensureStore('abastecimentos', { keyPath: 'id', autoIncrement: true }, [
        { name: 'data', keyPath: 'data' },
        { name: 'viaturaId', keyPath: 'viaturaId' },
        { name: 'motoristaId', keyPath: 'motoristaId' }
      ]);

      ensureStore('manutencoes', { keyPath: 'id', autoIncrement: true }, [
        { name: 'dataAgendada', keyPath: 'dataAgendada' },
        { name: 'viaturaId', keyPath: 'viaturaId' },
        { name: 'status', keyPath: 'status' }
      ]);

      ensureStore('reparos', { keyPath: 'id', autoIncrement: true }, [
        { name: 'data', keyPath: 'data' },
        { name: 'viaturaId', keyPath: 'viaturaId' }
      ]);

      ensureStore('syncQueue', { keyPath: 'id', autoIncrement: true }, [
        { name: 'status', keyPath: 'status' },
        { name: 'entity', keyPath: 'entity' }
      ]);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => reject(request.error);
  });
}

function getStore(storeName, mode = 'readonly') {
  return dbInstance.transaction(storeName, mode).objectStore(storeName);
}

function getAll(storeName) {
  return new Promise((resolve, reject) => {
    const req = getStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function getOne(storeName, id) {
  return new Promise((resolve, reject) => {
    const req = getStore(storeName).get(Number(id));
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

function addRecord(storeName, data) {
  return new Promise((resolve, reject) => {
    const req = getStore(storeName, 'readwrite').add(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function putRecord(storeName, data) {
  return new Promise((resolve, reject) => {
    const req = getStore(storeName, 'readwrite').put(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function deleteRecord(storeName, id) {
  return new Promise((resolve, reject) => {
    const req = getStore(storeName, 'readwrite').delete(Number(id));
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

function countByIndex(storeName, indexName, value) {
  return new Promise((resolve, reject) => {
    const index = getStore(storeName).index(indexName);
    const req = index.count(value);
    req.onsuccess = () => resolve(req.result || 0);
    req.onerror = () => reject(req.error);
  });
}

function getAllByIndex(storeName, indexName, value) {
  return new Promise((resolve, reject) => {
    const index = getStore(storeName).index(indexName);
    const req = index.getAll(value);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
