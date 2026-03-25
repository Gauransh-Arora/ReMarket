class MemoryRedis {
  constructor() {
    this.store = new Map();
  }

  async get(key) {
    const item = this.store.get(key);
    if (!item) return null;

    if (item.expiry && item.expiry < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key, value, mode, duration) {
    let expiry = null;
    if (mode === 'EX' && duration) {
      expiry = Date.now() + duration * 1000;
    }
    this.store.set(key, { value, expiry });
    return 'OK';
  }

  async del(key) {
    this.store.delete(key);
    return 1;
  }

  on(event, callback) {
    if (event === 'connect') {
      setTimeout(callback, 0);
    }
  }
}

const redis = new MemoryRedis();

module.exports = redis;
