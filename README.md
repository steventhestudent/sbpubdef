# SPFx Solution: "sbpubdef-sol"

### docs/

-   [making the project - pnpm spfx macos.md](docs/making%20the%20project%20-%20pnpm%20spfx%20macos.md)
-   [transfer of work.md](docs/transfer%20of%20work/transfer%20of%20work.md)
-   [new webpart.md](docs/new%20webpart.md)
-   [new role.md](docs/new%20role.md)
-   [new azure function.md](docs/azure%20functions/new%20azure%20function.md)
-   [make and upload solution.md](docs/make%20and%20upload%20solution.md)
    &nbsp;

## Install

-   node w/ pnpm
    -   `pnpm env use --global 22`

1. `git clone https://github.com/steventhestudent/sbpubdef.git`
2. `cd sbpubdef`
3. `pnpm install`
4. `pnpm npx gulp trust-dev-cert`
5. `git config --local user.name ""  &&  git config --local user.email ""`
6. **optionally:** scraped forms / resource folder (private repo, so that this one can stay public): `git clone git@github.com:steventhestudent/sbpubdef-resources.git resource` ask for an invite

#### now, hot reload + tailwind (gulp) server works:

**webpart workbench:** ```pnpm run dev```

**other gulp serve commands:** ```pnpm run theme``` (hot reload webparts in-place on pages they're on) ~~```pnpm npx fast-serve --config=themeInjector```~~ ~~`pnpm npx gulp serve` (webparts) or ```gulp serve --config landingRedirectExt``` etc.~~

you may have to manually visit https://localhost:4321/temp/build/manifests.js to trust the certificate


&nbsp;

#### Upload to AppCatalog
```pnpm run make``` (.sppkg can be found in sharepoint/ dir)

**troubleshoot**: retry after
~~```pnpm npx gulp clean```~~
~~```pnpm run build```~~
```pnpm run tailwind:build```

&nbsp;


# using scripts/py
to use the app registration 'pnp', copy `.env.example` as  `.env.dev` (or `.env.prod`) and fill it out from Entra ID.

if using migration scripts: copy and edit` .env.migration.target.example`

&nbsp;

&nbsp;

### **Using NPM:** just run `npm install`... run w/o leading 'pnpm npx' (i.e.: instead of `pnpm npx gulp trust-dev-cert`, you will run `gulp trust-dev-cert`)
**Note:** you will have to change `package.json` scripts to use npm-style (drop  '```pnpm npx```' , etc.)

, then ```npm run dev``` or ```npm run theme``` works.

