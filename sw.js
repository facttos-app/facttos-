var CACHE="facttos-v3",AV="facttos-avatars";
var CDN="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
var SHELL=["./","./index.html","./manifest.json","./confidentialite.html","./icon-192.png","./icon-512.png","./favicon-48.png"];
self.addEventListener("install",function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){
    return Promise.all(SHELL.map(function(u){return c.add(u).catch(function(){})}).concat([c.add(new Request(CDN,{mode:"cors"})).catch(function(){})]));
  }));
  self.skipWaiting();
});
self.addEventListener("activate",function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){return k!==CACHE&&k!==AV}).map(function(k){return caches.delete(k)}));
  }));
  self.clients.claim();
});
function timed(r,ms){
  return new Promise(function(res,rej){
    var t=setTimeout(function(){rej(new Error("timeout"))},ms);
    fetch(r).then(function(x){clearTimeout(t);res(x)},function(er){clearTimeout(t);rej(er)});
  });
}
self.addEventListener("fetch",function(e){
  var r=e.request;
  if(r.method!=="GET")return;
  var u=new URL(r.url);
  if(r.url===CDN){
    e.respondWith(caches.match(CDN).then(function(m){
      return m||fetch(new Request(CDN,{mode:"cors"})).then(function(x){var cp=x.clone();caches.open(CACHE).then(function(c){c.put(CDN,cp)});return x});
    }));
    return;
  }
  if(u.hostname.slice(-12)===".supabase.co"&&u.pathname.indexOf("/storage/v1/object/public/avatars/")===0){
    e.respondWith(caches.open(AV).then(function(c){
      return c.match(r.url).then(function(m){
        var net=fetch(new Request(r.url,{mode:"cors"})).then(function(x){if(x.ok)c.put(r.url,x.clone());return x}).catch(function(){return m});
        return m||net;
      });
    }));
    return;
  }
  if(u.origin!==location.origin)return;
  e.respondWith(timed(r,5000).then(function(res){
    if(res.ok){var cp=res.clone();caches.open(CACHE).then(function(c){c.put(r,cp)})}
    return res;
  }).catch(function(){
    return caches.match(r,{ignoreSearch:true}).then(function(m){return m||caches.match("./index.html")});
  }));
});
