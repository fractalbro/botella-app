// Botella · service worker: instalable, íconos en caché y avisos push. La app siempre pide la versión nueva primero.
const C='botella-v6';
self.addEventListener('install',e=>{self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin||u.pathname.startsWith('/api/'))return;
  if(u.pathname.startsWith('/icons/')){e.respondWith(caches.open(C).then(c=>c.match(e.request).then(r=>r||fetch(e.request).then(n=>{if(n.ok)c.put(e.request,n.clone());return n;}))));return;}
  e.respondWith(fetch(e.request).then(n=>{if(n.ok){const cp=n.clone();caches.open(C).then(c=>c.put(e.request,cp));}return n;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('/'))));});
// Avisos: el servidor manda {title, body, go, ref}. Siempre se muestra (iOS lo exige); el servidor no manda si la app está abierta.
self.addEventListener('push',e=>{let d={};try{d=e.data?e.data.json():{};}catch(x){d={title:'Botella',body:e.data&&e.data.text()};}
  e.waitUntil(self.registration.showNotification(d.title||'Botella',{body:d.body||'',icon:'/icons/icon-192.png',badge:'/icons/icon-192.png',tag:d.id||d.kind||'botella',data:{go:d.go||'orilla',ref:d.ref||null}}));});
self.addEventListener('notificationclick',e=>{e.notification.close();const d=e.notification.data||{};
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{
    const c=cs.find(x=>new URL(x.url).origin===location.origin);
    if(c){c.postMessage({type:'go',go:d.go,ref:d.ref});return c.focus();}
    return self.clients.openWindow('/?go='+encodeURIComponent(d.go||'')+(d.ref?'&ref='+encodeURIComponent(d.ref):''));
  }));});
