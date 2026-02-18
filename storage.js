// ===== GREENKEEPER - Local Storage Layer =====
// All data stored in localStorage. No server needed.

const localDB = {
  getCollection(name) {
    return JSON.parse(localStorage.getItem('gk_' + name) || '[]');
  },
  saveCollection(name, data) {
    localStorage.setItem('gk_' + name, JSON.stringify(data));
  },
  async getAll(collection) {
    var items = this.getCollection(collection);
    items.sort(function(a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
    return items;
  },
  async add(collection, data) {
    data.createdAt = Date.now();
    data.id = 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    var items = this.getCollection(collection);
    items.unshift(data);
    this.saveCollection(collection, items);
    return data;
  },
  async update(collection, id, data) {
    var items = this.getCollection(collection);
    var idx = items.findIndex(function(i) { return i.id === id; });
    if (idx !== -1) {
      Object.assign(items[idx], data);
      this.saveCollection(collection, items);
    }
  },
  async remove(collection, id) {
    var items = this.getCollection(collection);
    items = items.filter(function(i) { return i.id !== id; });
    this.saveCollection(collection, items);
  },
  async uploadImage(file) {
    return new Promise(function(resolve) {
      var reader = new FileReader();
      reader.onload = function() { resolve(reader.result); };
      reader.readAsDataURL(file);
    });
  }
};
