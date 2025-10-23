import { Log } from '@microsoft/sp-core-library';
import { BaseApplicationCustomizer } from '@microsoft/sp-application-base';
import * as strings from 'ThemeInjectorApplicationCustomizerStrings';
import "@dist/tailwind.css"; // comment out in production?

export default class ThemeInjectorApplicationCustomizer extends BaseApplicationCustomizer<{}> {
  public onInit(): Promise<void> {
    Log.info('ThemeInjectorApplicationCustomizer', `Initialized ${strings.Title}`);

    // inject <style> (ensure these tailwind classes exist)
    const text = document.createTextNode(`
      .\\!max-w-full {max-width: 100% !important;}
    `);
    const styles = document.createElement('style');
    styles.appendChild(text);
    document.body.appendChild(styles);

    document.querySelector(".CanvasComponent")!.children[0].classList.add("!max-w-full");

    return Promise.resolve();
  }
}
