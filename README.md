# sbpubdef-sol
see docs/spfx for documentation and notes

# install
- laptops need: git, vscode
- node w/ pnpm
  - ```pnpm env use --global lts```
- ..


# set up SPFx dev environment
1. ```git clone https://github.com/steventhestudent/sbpubdef.git```
1. ```pnpm install```
1. ```pnpm npx gulp trust-dev-cert```

now live reload server works:

```pnpm npx gulp serve```

# production releases
see README @ steventhestudent/sbpubdef-legacy for detailed instructions