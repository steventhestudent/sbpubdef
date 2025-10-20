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
- ```pnpm approve-builds``` (yo)
- ```pnpm npx gulp trust-dev-cert```

### develop:

```
npm npx gulp serve –nobrowser
```

### recommended (only allow pnpm pkg management):

add to package.json "scripts":

```
"preinstall": "npx only-allow pnpm",
```


&nbsp;

# had to ```pnpm add mem-fs``` (to add to the solution)



&nbsp;


&nbsp;

# Tailwind
<details>
<summary>Setup tailwind 4 with SPFx #16102</summary>
https://tailwindcss.com/docs/installation/using-postcss
When I try to use tailwind 4 with rsuitejs, rsuite.min.css is render higher than tailwind.css.
I've done this steps to setup:
	1	Create spfx project (obviously), install plugin for tailwind (if not installed)
	2	install this packages: npm i tailwindcss @tailwindcss/postcss autoprefixer gulp-postcss
	3	  
	4	Create somewhere tailwind.css in /src/ folder and put in it following code: @import "tailwindcss";
	5	  
	6	Put in gulpe.json this code before build.initialize(require('gulp')); (almost there): const postcss = require("gulp-postcss");
	7	const tailwind = require("@tailwindcss/postcss");
	8	
	9	const tailwindcss = build.subTask(
	10	"@tailwindcss/postcss",
	11	function (gulp, buildOptions, done) {
	12	    gulp
	13	        .src("./src/tailwind.css")
	14	        .pipe(
	15	            postcss([
	16	            tailwind("./tailwind.config.js"),
	17	            ])
	18	        )
	19	        .pipe(gulp.dest("dist"));
	20	    done();
	21	}
	22	);
	23	build.rig.addPreBuildTask(tailwindcss);
	24	  
	25	Finally add in core of spfx typescript import "../../../dist/tailwind.css" and setup button:
</details>