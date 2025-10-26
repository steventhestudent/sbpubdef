import { Log } from '@microsoft/sp-core-library';
import { BaseApplicationCustomizer } from '@microsoft/sp-application-base';
import * as strings from 'ThemeInjectorApplicationCustomizerStrings';
import "../../styles" // import '@styles'; // imports src/styles/index.ts                  <--- for some reason this alias doesn't work, even though it points to a typescript file...

export default class ThemeInjectorApplicationCustomizer extends BaseApplicationCustomizer<{}> {
  public async onInit(): Promise<void> {
    Log.info('ThemeInjectorApplicationCustomizer', `Initialized ${strings.Title}`);
    console.log(`themeInjector.properties:`, this.properties);

    // // inject <style> (ensure these tailwind classes exist)
    // const text = document.createTextNode(`
    //   .\\!max-w-full {max-width: 100% !important;}
    // `);
    // const styles = document.createElement('style');
    // styles.appendChild(text);
    // document.body.appendChild(styles);
    //
    // document.querySelector(".CanvasComponent")!.children[0].classList.add("!max-w-full");
    // Array.from(document.querySelectorAll(".CanvasZoneSectionContainer")).forEach((el) => el.classList.add("!max-w-full"));
    // // document.querySelector("div[aria-label=\"DismissibleAnnouncementStrip\"]")?.querySelector("");

    function MarginBtn() {
      const btn = document.createElement("button");
      btn.innerText = "⏹️";btn.style.fontSize = "18px";btn.style.cursor = "pointer";btn.title = "Toggle Webpart Margin / Padding (ThemeInjector.MarginBtn)";
      btn.addEventListener("click", () => {
        if (document.querySelector("#themeInjector\\.MarginBtn")) return document.querySelector("#themeInjector\\.MarginBtn")?.remove();
        const stylesheet = document.createElement('style');
        stylesheet.id = "themeInjector.MarginBtn";
        stylesheet.appendChild(document.createTextNode(`
          .CanvasZone {padding: 0 !important;}
          .CanvasZoneSectionContainer .CanvasSection {padding: 0 !important;}
          .CanvasSection .ControlZone {margin: 0 !important; padding: 0 !important;}
        `));
        document.head.appendChild(stylesheet);
      });
      return btn;
    }
    const getToolbar = () => document.querySelector(".fui-Toolbar .ms-OverflowSet:last-of-type, .fui-FluentProvider .ms-OverflowSet:last-of-type"); // add after ↙↗ 'Expand Content' btn. fui-FluentProvider = Site Contents view
    const performInsert = () =>
      setTimeout(() => getToolbar()?.appendChild(MarginBtn()), 333);
    (function pollInsert() {
      if (!getToolbar()) setTimeout(pollInsert, 333); else setTimeout(performInsert, 333);
    })();

    return Promise.resolve();
  }
}
