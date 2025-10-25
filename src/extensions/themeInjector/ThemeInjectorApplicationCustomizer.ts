import { Log } from '@microsoft/sp-core-library';
import { BaseApplicationCustomizer } from '@microsoft/sp-application-base';
import * as strings from 'ThemeInjectorApplicationCustomizerStrings';
import "../../styles/SharePointStyleOverride.css"
import "@dist/tailwind.css"; // to do: comment out in production? (do webparts all include a copy of it!?)

export default class ThemeInjectorApplicationCustomizer extends BaseApplicationCustomizer<{}> {
  public async onInit(): Promise<void> {
    Log.info('ThemeInjectorApplicationCustomizer', `Initialized ${strings.Title}`);
    console.log(`themeInjector.properties:`, this.properties);

    // const SharePointStyleOverride = document.createElement('style');
    // SharePointStyleOverride.appendChild(document.createTextNode(`
    //   /* override sharepoint max-width */
    //   .CanvasComponent, .CanvasZoneSectionContainer {max-width: 100% !important;}
    // `));
    // document.body.appendChild(SharePointStyleOverride);

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

    return Promise.resolve();
  }
}
