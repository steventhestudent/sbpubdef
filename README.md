# SPFx Solution: "sbpubdef-sol"

### docs/

-   [sbpubdef todo.md](https://github.com/steventhestudent/sbpubdef/blob/main/docs/sbpubdef%20todo.md)
-   [laptop notes.md](https://github.com/steventhestudent/sbpubdef/blob/main/docs/laptop%20notes.md)
-   [making the project - pnpm spfx macos.md](https://github.com/steventhestudent/sbpubdef/blob/main/docs/making%20the%20project%20-%20pnpm%20spfx%20macos.md)
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

now live reload server works:

`pnpm npx gulp serve` (webparts) or ```gulp serve --config landingRedirectExt``` etc. 

&nbsp;

**dev environment details:** `spfx sharepoint pnpm macos.md`

**using npm:** just run `npm install`... also run w/o leading 'pnpm npx' (i.e.: instead of `pnpm npx gulp trust-dev-cert`, you will run `gulp trust-dev-cert`)

&nbsp;

## Production release + install as sharepoint app

see README @ steventhestudent/sbpubdef-legacy for detailed instructions

&nbsp;

&nbsp;

## ¿ Laptop rotation ?

services i am logged in:

-   git cli &nbsp; &nbsp;-so you will have to `git config --local user.name "x" && git config --local user.email "x@x.com"`
-   browser:
    -   github
    -   chatgpt
