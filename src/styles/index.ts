// import '@styles'; // imports src/styles/index.ts                  <--- for some reason this alias doesn't work, even though it points to a typescript file...
import "./SharePointStyleOverride.css"
import "./scrollbar-thin.css"
import "@dist/tailwind.css"; // to do: comment out in production? (do webparts all include a copy of it!?)
