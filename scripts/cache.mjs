import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const root = "docs";
const files = fs
  .readdirSync(root, { recursive: true })
  .filter(
    (n) =>
      n !== "sw.js" &&
      !n.startsWith(".") &&
      fs.statSync(path.join(root, n)).isFile(),
  )
  .sort();
const hash = createHash("sha256");
for (const n of files)
  hash.update(n).update(fs.readFileSync(path.join(root, n)));
const cache = hash.digest("hex").slice(0, 16);
fs.writeFileSync(
  path.join(root, "sw.js"),
  `const prefix='sweetie:'+self.registration.scope+':',key=prefix+${JSON.stringify(cache)},files=${JSON.stringify(files.map((n) => "./" + n))};
self.addEventListener('install',e=>e.waitUntil((async()=>{const c=await caches.open(key);for(let i=0;i<files.length;i+=8)await c.addAll(files.slice(i,i+8).map(f=>new Request(new URL(f,self.registration.scope),{cache:'reload'})));await self.skipWaiting()})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{const previous=(await caches.keys()).filter(k=>k.startsWith(prefix)&&k!==key);for(const k of previous)await caches.delete(k);await self.clients.claim();if(previous.length)for(const client of await self.clients.matchAll({type:'window'})){const u=new URL(client.url);if(u.href.startsWith(self.registration.scope)&&['','#home','#street'].includes(u.hash))await client.navigate(client.url)}})()));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin||!u.href.startsWith(self.registration.scope))return;const lookup=e.request.mode==='navigate'?new URL('index.html',self.registration.scope).href:e.request;e.respondWith(caches.open(key).then(async c=>(await c.match(lookup))||fetch(e.request)))});`,
);
fs.writeFileSync(path.join(root, ".nojekyll"), "");
