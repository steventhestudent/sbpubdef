1.
```
pnpm npx yo @microsoft/sharepoint --skip-install
pnpm install
```
2. undo changes
    - new default search config https://&lt;tenant&gt;/_layouts/workbench.aspx <-- remove this (modify config/serve.json)
    - undo extensionType change (modify .yo-rc.json)
      - note: it may have tried to change node version
3. remove .scss references in webpart (avoiding postcss.config.js *require* not allowed error)
