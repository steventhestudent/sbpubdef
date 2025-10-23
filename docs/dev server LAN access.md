add to serve.json: ```"hostname": "0.0.0.0",```
- ```pnpm npx gulp untrust-dev-cert```
- ```pnpm gulp trust-dev-cert --hostname 192.168.0.xxx```

visit:

https://192.168.0.xxx:4321/temp/build/manifests.js to trust the cert on ipad

now, visiting with query string:

[?debugManifestsFile=https%3A%2F%2F192.168.0.xxx%3A4321%2Ftemp%2Fbuild%2Fmanifests.js&loadSPFX=true&customActions=...](https://csproject25.sharepoint.com/sites/Attorney?debugManifestsFile=https%3A%2F%2F192.168.0.221%3A4321%2Ftemp%2Fbuild%2Fmanifests.js&loadSPFX=true&customActions={%223428f2ca-3584-4a31-aab2-c02d8cf38951%22%3A{%22location%22%3A%22ClientSideExtension.ApplicationCustomizer%22%2C%22properties%22%3A{%22testMessage%22%3A%22Test+message%22}}})

works (notice 192.168.0.xxx (replace with your ipconfig/ifconfig/iwconfig))

**note:** ios safari doesn't work...