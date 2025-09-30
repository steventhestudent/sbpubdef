# sharepoint spfx pnpm (macos)

node 22 lts

### install deps to scaffold:

```
pnpm add yo gulp-cli @microsoft/generator-sharepoint
```

### call `pnpm i --shamefully-hoist` when `pnpm install` is called:
```
pnpm config set shamefully-hoist true --location project
```

### scaffold project:

if installing w/ npm, run _yo_ w/o _pnpm npx_
```
pnpm npx yo @microsoft/sharepoint --skip-install
```

### install proj dependencies:

```
pnpm install
```

### run once:

```
pnpm npx gulp trust-dev-cert
```

### develop:

```
npm npx gulp serve –nobrowser
```

### recommended (only allow pnpm pkg management):

add to package.json "scripts":

```
"preinstall": "npx only-allow pnpm",
```
