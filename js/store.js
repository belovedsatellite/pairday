/* 브라우저 자동 저장 (IndexedDB) */
window.Store = (function () {
  let dbp = null;
  function open() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB 미지원'));
    if (!dbp) {
      dbp = new Promise((res, rej) => {
        const r = indexedDB.open('pair-day-maker', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    }
    return dbp;
  }
  function tx(mode, fn) {
    return open().then(db => new Promise((res, rej) => {
      const t = db.transaction('kv', mode);
      const req = fn(t.objectStore('kv'));
      t.oncomplete = () => res(req ? req.result : undefined);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    }));
  }
  return {
    get: k => tx('readonly', s => s.get(k)),
    set: (k, v) => tx('readwrite', s => s.put(v, k)),
    del: k => tx('readwrite', s => s.delete(k)),
    keys: () => tx('readonly', s => s.getAllKeys())
  };
})();
