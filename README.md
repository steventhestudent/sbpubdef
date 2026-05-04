# SPFx Solution: "sbpubdef-sol"

### docs/

-   [making the project - pnpm spfx macos.md](docs/making%20the%20project%20-%20pnpm%20spfx%20macos.md)
-   [laptop notes.md](docs/laptop%20notes.md)
-   [new webpart.md](docs/transfer%20of%20work/transfer%20of%20work.md)
-   [new webpart.md](docs/new%20webpart.md)
-   [new webpart.md](docs/new%20role.md)
-   [new azure function.md](docs/azure%20functions/new%20azure%20function.md)
-   [make and upload solution.md](docs/make%20and%20upload%20solution.md)
    &nbsp;

## Install

-   laptops need: git, vscode, [chatgpt (edu)](https://www.calstatela.edu/genai/chatgpt-edu-faq)
-   node w/ pnpm
    -   `pnpm env use --global lts`

1. `git clone https://github.com/steventhestudent/sbpubdef.git`
2. `cd sbpubdef`
3. `pnpm install`
4. `pnpm npx gulp trust-dev-cert`
5. `git config --local user.name ""  &&  git config --local user.email "@calstatela.edu"`
6. **optionally:** scraped forms / resource folder (private repo, so that this one can stay public): `git clone git@github.com:steventhestudent/sbpubdef-resources.git resource` ask for an invite

#### now, hot reload + tailwind (gulp) server works:

**webpart workbench:** ```pnpm run dev```

**other gulp serve commands:** ```pnpm theme``` ~~```pnpm npx fast-serve --config=themeInjector```~~ ~~`pnpm npx gulp serve` (webparts) or ```gulp serve --config landingRedirectExt``` etc.~~

you may have to manually visit https://localhost:4321/temp/build/manifests.js to trust the certificate


&nbsp;

#### Upload to AppCatalog
```pnpm run make``` (.sppkg can be found in sharepoint/ dir)

**troubleshoot**: retry after
~~```pnpm npx gulp clean```~~
~~```pnpm run build```~~
```pnpm run tailwind:build```

&nbsp;

**Dev Environment (Details):** `making the project - pnpm spfx macos.md`

&nbsp;

### **Using NPM:** just run `npm install`... also run w/o leading 'pnpm npx' (i.e.: instead of `pnpm npx gulp trust-dev-cert`, you will run `gulp trust-dev-cert`)
**Note:** you will have to change Package.json scripts to use npm-style (i.e.: drop the '```pnpm npx```')

then ```npm run dev``` works.

# Ask for environment file (config/.env.dev) —currently only `scripts/py/sharepoint_upload_to_doc_lib.py` depends on it

&nbsp;

&nbsp;

## Laptop rotation

Logged in on:
-   git cli &nbsp; &nbsp;-so you will have to `git config --local user.name "x" && git config --local user.email "x@x.com"`
-   browser:
    -   github
    -   chatgpt
