import * as React from "react";
import {Label} from "@fluentui/react";

export const WelcomeSearch: () => JSX.Element = () => (<form role="search" style={{textAlign: "center"}}>
	<Label>
		Search:
		<input role="combobox" type="search" aria-autocomplete="list" aria-controls="ms-searchux-popup-0" accessKey="S"
			spellCheck="false" autoComplete="off" autoCorrect="false" data-nav="true" data-tab="true" maxLength={500}
			placeholder="Search..." className="" aria-expanded="true" name="WelcomeSearch" />
		<button>↠</button>
	</Label>
</form>);