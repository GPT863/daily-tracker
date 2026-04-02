const CACHE_NAME = 'daily-tracker-v37';
const APP_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './vendor/chart.umd.min.js',
  './icons/app-icon.svg',
  './icons/app-icon-monochrome.svg'
];

// 安装事件 - 缓存应用资源
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching app assets');
      return cache.addAll(APP_ASSETS);
    }).then(() => {
      console.log('[SW] Installation complete');
      return self.skipWaiting();
    }).catch(error => {
      console.error('[SW] Installation failed:', error);
    })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all([
        keys.filter(key => key !== CACHE_NAME).map(key => {
          console.log('[SW] Deleting old cache:', key);
          return caches.delete(key);
        }),
        self.clients.claim()
      ]);
    }).then(() => {
      console.log('[SW] Activation complete');
    })
  );
});

// 网络请求拦截 - 离线缓存策略
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理同源请求
  if (url.origin !== location.origin) {
    return;
  }

  // 只处理 GET 请求
  if (request.method !== 'GET') {
    return;
  }

  // 对于导航请求，使用网络优先策略
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // 缓存成功的响应
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, cloned);
          });
          return response;
        })
        .catch(() => {
          // 网络失败时从缓存加载
          return caches.match(request).then(cached => {
            return cached || caches.match('./index.html');
          });
        })
    );
    return;
  }

  // 对于静态资源，使用缓存优先策略
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) {
        // 后台更新缓存
        fetch(request).then(response => {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, cloned);
          });
        }).catch(() => {}); // 忽略网络错误
        return cached;
      }

      // 缓存中不存在，从网络获取
      return fetch(request)
        .then(response => {
          // 只缓存成功的响应
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, cloned);
          });
          return response;
        })
        .catch(() => {
          // 网络失败，返回离线页面
          return caches.match('./index.html');
        });
    })
  );
});

// 接收主线程消息
self.addEventListener('message', event => {
  if (!event.data) return;

  switch (event.data.type) {
    case 'SYNC_REMINDERS':
      self.reminders = event.data.reminders || [];
      break;
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'GET_CACHE_SIZE':
      getCacheSize().then(size => {
        event.ports[0].postMessage({ type: 'CACHE_SIZE', size });
      });
      break;
    case 'CLEAR_CACHE':
      clearCache().then(() => {
        event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
      });
      break;
  }
});

// 后台同步
self.addEventListener('sync', event => {
  if (event.tag === 'daily-tracker-sync') {
    event.waitUntil(
      Promise.resolve().then(() => {
        console.log('[SW] Background sync completed');
      })
    );
  }
});

// 通知点击处理
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // 查找已打开的窗口
      const existing = windowClients.find(client => 'focus' in client);
      if (existing) {
        return existing.focus();
      }
      // 没有打开的窗口，打开新窗口
      return clients.openWindow('./');
    })
  );
});

// 推送通知处理
self.addEventListener('push', event => {
  if (!event.data) {
    return;
  }

  const data = event.data.json();
  const options = {
    body: data.body || '',
    icon: './icons/app-icon.svg',
    badge: './icons/app-icon-monochrome.svg',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || './'
    },
    actions: [
      {
        action: 'view',
        title: '查看'
      },
      {
        action: 'close',
        title: '关闭'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '健康提醒', options)
  );
});

// 获取缓存大小
async function getCacheSize() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  let size = 0;

  for (const request of keys) {
    const response = await cache.match(request);
    if (response) {
      const blob = await response.blob();
      size += blob.size;
    }
  }

  return size;
}

// 清理缓存
async function clearCache() {
  await caches.delete(CACHE_NAME);
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(APP_ASSETS);
}
