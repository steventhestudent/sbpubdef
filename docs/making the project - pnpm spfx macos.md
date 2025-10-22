# sharepoint spfx pnpm (macos)

node 22 lts

### install deps to scaffold:

```pnpm add yo gulp-cli @microsoft/generator-sharepoint mem-fs```

whenever it asks to approve-builds, do so, with: ```pnpm approve-builds```

### call `pnpm i --shamefully-hoist` when `pnpm install` is called:
```pnpm config set shamefully-hoist true --location project```

### scaffold project:

if installing w/ npm, run _yo_ w/o _pnpm npx_
```pnpm npx yo @microsoft/sharepoint --skip-install```

### install proj dependencies:

```pnpm install```

### run once:
- ```pnpm npx gulp trust-dev-cert```

### develop:

```pnpm npx gulp serve```

### ~~recommended (only allow pnpm pkg management):~~

add to package.json "scripts":

```"preinstall": "npx only-allow pnpm",```



&nbsp;

&nbsp;



# Tailwind (with SPFx)
- ```pnpm add tailwindcss @tailwindcss/cli```
- pnpm add tailwindcss @tailwindcss/postcss postcss gulp-postcss
- pnpm add -D autoprefixer@10
- pnpm approve-builds
- files to add/modify: postcss.config.js + gulpfilejs + src/styles/tailwind.css (@import "tailwindcss";)
  - postcss.config.js:
```
const tailwindPlugin = require('@tailwindcss/postcss');
const autoprefixer = require('autoprefixer');

module.exports = {
    plugins: {
        '@tailwindcss/postcss': tailwindPlugin(),
        autoprefixer: autoprefixer(),
    },
};
now you can import tailwind.css in your .tsx (test w/ className="text-red-900", etc.)
```
<details>
<summary>Setup tailwind 4 with SPFx #16102</summary>
[Official Docs (using-postcss)](https://tailwindcss.com/docs/installation/using-postcss)
</details>


# Aliases
add in tsconfig compileroptions:
```
		"baseUrl": ".",
		"paths": {
			"@dist/*": ["dist/*"],
			"@styles/*": ["src/styles/*"],
			"@webparts/*": ["src/webparts/*"],
			"@extensions/*": ["src/extensions/*"],
		},
```

add to gulpfile.js (before ```build.initialize(require('gulp'));```):
```
// aliases
build.configureWebpack.mergeConfig({
    additionalConfiguration: (generatedConfig) => {
        generatedConfig.resolve = generatedConfig.resolve || {};
        generatedConfig.resolve.alias = {
            ...(generatedConfig.resolve.alias || {}),
            '@dist': path.resolve(__dirname, 'dist'),
            '@styles': path.resolve(__dirname, 'lib/styles'),
            '@webparts': path.resolve(__dirname, 'lib/webparts'),
            '@extensions': path.resolve(__dirname, 'lib/extensions'),
        };
        return generatedConfig;
    },
});
```
#### tailwind.config.js
```
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx,scss,html}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

now you can: ```import "@webparts/welcomeMessage/components/"``` or ```import "@dist/tailwind.css"```

# fast-serve (hot reload)
- ```pnpm add spfx-fast-serve```
- ```pnpm add spfx-fast-serve-helpers --save-dev```
- ```pnpm exec spfx-fast-serve```

now, you can: ```pnpm exec fast-serve``` or ```fast-serve``` (npm)
...but we are going to use ```pnpm run dev``` which will run that + our tailwind watcher
- ```pnpm add -D concurrently```

package.json — add into scripts {...}
```
    "tailwind:build": "tailwindcss -i ./src/styles/tailwind.css -o ./dist/tailwind.css --minify",
    "tailwind:watch": "tailwindcss -i ./src/styles/tailwind.css -o ./dist/tailwind.css --watch",
    "dev": "concurrently \"pnpm exec tailwind:watch\" \"pnpm exec fast-serve\""
```
now you can ```pnpm run tailwind:watch``` in one tab, ```pnpm exec fast-serve``` in another
or (equivalent): ```pnpm run dev```
