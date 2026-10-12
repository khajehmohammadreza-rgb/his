/* Bastiyan HIS R5: compatibility worker only; the main application never registers it. */
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{try{await self.registration.unregister();}finally{await self.clients.claim();}})()));
