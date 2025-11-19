import "@styles/SharePointStyleOverride.css";
import "@styles/scrollbar-thin.css";
import "@dist/tailwind.css"; // to do: comment out in production? (do webparts all include a copy of it!?)
import "../../styles/pd.css";
import "../../styles/custom-overrides.css";

import { Log } from "@microsoft/sp-core-library";
import { BaseApplicationCustomizer } from "@microsoft/sp-application-base";
import * as strings from "ThemeInjectorApplicationCustomizerStrings";
import { DismissibleAnnouncementStrip } from "./DismissibleAnnouncementStrip";
import { CompactMode } from "./CompactMode";

/**
 * Normalize the small icon buttons in the M365 suite header (top-right).
 * These live outside the site header and often render after page load,
 * so we retry a few times and also re-run on navigation.
 */
function applySuiteHeaderFixes(): void {
  const styleButton = (el: HTMLElement) => {
    el.style.borderRadius = "6px";
    el.style.margin = "0 2px";
    el.style.height = "32px";
    el.style.minHeight = "32px";
    el.style.minWidth = "32px";
    el.style.padding = "0 10px";
    el.style.border = "1px solid rgba(255,255,255,0.25)";
    el.style.background = "rgba(255,255,255,0.10)";
    el.style.boxShadow = "none";
    el.style.transition = "background .15s ease, border-color .15s ease";

    el.onmouseenter = () => {
      el.style.background = "rgba(255,255,255,0.20)";
      el.style.borderColor = "rgba(255,255,255,0.30)";
    };
    el.onmouseleave = () => {
      el.style.background = "rgba(255,255,255,0.10)";
      el.style.borderColor = "rgba(255,255,255,0.25)";
    };
  };

  // Try repeatedly because the suite header is async-rendered
  let tries = 0;
  const maxTries = 10;
  const timer = setInterval(() => {
    tries++;

    // Common containers across tenants/updates
    const suiteContainers = [
      document.querySelector("#SuiteNavPlaceHolder"),
      document.querySelector('[data-automationid="TopNavBar"]'),
      document.querySelector('[data-automation-id="O365Header"]'),
      document.querySelector('div[role="menubar"]'),
      document.querySelector('div[role="toolbar"]'),
    ].filter(Boolean) as HTMLElement[];

    if (suiteContainers.length) {
      suiteContainers.forEach(container => {
        const candidates = container.querySelectorAll<HTMLElement>(
          'button, div[role="button"], .ms-Button'
        );
        if (candidates.length) {
          candidates.forEach(btn => styleButton(btn));
          clearInterval(timer);
        }
      });
    }

    if (tries >= maxTries) clearInterval(timer);
  }, 800);
}

export default class ThemeInjectorApplicationCustomizer extends BaseApplicationCustomizer<{}> {
  public async onInit(): Promise<void> {
    Log.info("ThemeInjectorApplicationCustomizer", `Initialized ${strings.Title}`);
    this.context.application.navigatedEvent.add(this, this.onNavigate);
    console.log(`themeInjector.properties:`, this.properties);

    CompactMode();

    // 👇 Make the top-right suite buttons look consistent
    applySuiteHeaderFixes();

    return Promise.resolve();
  }

  private onNavigate(): void {
    DismissibleAnnouncementStrip();
    // Re-apply in case the suite header re-renders on navigation
    applySuiteHeaderFixes();
  }
}
