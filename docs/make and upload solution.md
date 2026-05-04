# make and upload solution
1. `pnpm run make` creates sharepoint/solution/sbpubdef-sol.sppkg
2. upload to AppCatalog

# legacy spfx readme (sbpubdef-legacy)
when ready to make a release, edit:

config/write-manifests.json (NOTES)

cdn values:
```
gulp: "cdnBasePath": "<!-- PATH TO CDN -->"
dev (onprem): "cdnBasePath": "http://win-gfmcj0b11it/sites/AppCatalog/ClientSideAssets1/sbpubdef-sol/1.0.0"
production: "cdnBasePath": "https://tenant.sharepoint.com/sites/AppCatalog/ClientSideAssets/sbpubdef-sol/1.0.0"
```
ClientSideAssets is a document library w/ folder sbpudef-sol w/ folder for each release (i.e.: folder 1.0.0 is all files in temp/deploy)

make a release

`gulp bundle --ship && gulp package-solution --ship`
Now upload sharepoint/sbpubdef-sol.sppkg to /sites/AppCatalog
Upload temp/deploy to /sites/AppCatalog/ClientSideAssets/sbpubdef-sol/ (this is in lieu of using Microsoft 365 CDN / other CDN)
You need to add to Apps for SharePoint (/sites/appcatalog/AppCatalog/Forms/AllItems.aspx) and also add the app in Site Contents for your site/site collection.
Webparts part of the solution are now available in edit page!


maybe unecessary note:

you may have noticed ClientSideAssets1 in the dev cdn value... my dev server seemed to have a naming conflict I couldn't resolve by editing AppCatalog Site Contents. (note to self: i had to create AppCatalog sitecollection (in which i made document library: ClientSideAssets1)... but it's supposed to be a farm feature (so maybe that explains the conflict)?)

... This package produces the following:

lib/* - intermediate-stage commonjs build artifacts

dist/* - the bundled script, along with other resources

deploy/* - all resources which should be uploaded to a CDN.




- extensions: ensure they exist in ClientSideInstance.xml (define prod props here), elements.xml, ... you only put props in extension's .manifest.js for defaults used only if no instance props are supplied at deploy time.
