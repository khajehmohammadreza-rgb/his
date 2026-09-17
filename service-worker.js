const CACHE='bastiyan-his-4.5.8';
self.addEventListener('install',event=>{
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    for(const k of await caches.keys()) {
      await caches.delete(k);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));
});
