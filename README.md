# SPFx Solution: "sbpubdef-sol"

### docs/

-   [making the project - pnpm spfx macos.md](https://github.com/steventhestudent/sbpubdef/blob/main/docs/making%20the%20project%20-%20pnpm%20spfx%20macos.md)
-   [laptop notes.md](https://github.com/steventhestudent/sbpubdef/blob/main/docs/laptop%20notes.md)
-   [sbpubdef todo.md](https://github.com/steventhestudent/sbpubdef/blob/main/docs/sbpubdef%20todo.md)
-   [flow — Add Embed Page (List Item) - New Page-Embed.md](https://github.com/steventhestudent/sbpubdef/blob/main/docs/flow%20%E2%80%94%20Add%20Embed%20Page%20(List%20item)%20-%20New%20Page-Embed.md)
    &nbsp;

## Install

-   laptops need: git, vscode, [chatgpt (edu)](https://www.calstatela.edu/genai/chatgpt-edu-faq)
-   node w/ pnpm
    -   `pnpm env use --global lts`

1. `git clone https://github.com/steventhestudent/sbpubdef.git`
2. `cd sbpudef`
3. `pnpm install`
4. `pnpm npx gulp trust-dev-cert`
5. **optionally:** scraped forms / resource folder (private repo, so that this one can stay public): `git clone git@github.com:steventhestudent/sbpubdef-resources.git resource` ask for an invite

#### now, hot reload + tailwind (gulp) server works:

**webpart workbench:** ```pnpm run dev```

**extension:** ```pnpm npx fast-serve --config=themeInjector```~~`pnpm npx gulp serve` (webparts) or ```gulp serve --config landingRedirectExt``` etc.~~

&nbsp;

#### Upload to AppCatalog
```pnpm run make``` (.sppkg can be found in sharepoint/ dir)

**troubleshoot**: retry after
~~```pnpm npx gulp clean```~~
~~```pnpm run build```~~
```pnpm run tailwind:build```

**Production release + install as sharepoint app**

see [README](https://github.com/steventhestudent/sbpubdef-legacy.git) (sbpubdef-legacy) for detailed instructions

- extensions: ensure they exist in ClientSideInstance.xml (define prod props here), elements.xml, ... you only put props in extension's .manifest.js for defaults used only if no instance props are supplied at deploy time.

&nbsp;

**Dev Environment (Details):** `making the project - pnpm spfx macos.md`

&nbsp;

### **Using NPM:** just run `npm install`... also run w/o leading 'pnpm npx' (i.e.: instead of `pnpm npx gulp trust-dev-cert`, you will run `gulp trust-dev-cert`)
**Note:** you will have to change Package.json scripts to use npm-style (i.e.: drop the '```pnpm npx```')

then ```npm run dev``` works.
&nbsp;

&nbsp;

## Laptop rotation

Logged in on:
-   git cli &nbsp; &nbsp;-so you will have to `git config --local user.name "x" && git config --local user.email "x@x.com"`
-   browser:
    -   github
    -   chatgpt
