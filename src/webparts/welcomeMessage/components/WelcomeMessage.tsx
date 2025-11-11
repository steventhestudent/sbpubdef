import * as React from "react";
// import styles from './WelcomeMessage.module.scss';
import type { IWelcomeMessageProps } from "./IWelcomeMessageProps";
import { escape } from "@microsoft/sp-lodash-subset";
import { WelcomeSearch } from "./WelcomeSearch";

export default class WelcomeMessage extends React.Component<IWelcomeMessageProps> {
	public render(): React.ReactElement<IWelcomeMessageProps> {
		const { userDisplayName } = this.props;
		return (
			<section>
				<div className="rounded-xl border border-[var(--webpart-border-color)] p-6 shadow-sm bg-[#f3f3f3]">
					<h2 className="text-center text-xl font-semibold text-slate-800">
						Welcome to the Public Defender Resource Center,
						{escape(userDisplayName)}!
					</h2>
					<p className="text-center mt-1 text-sm text-slate-600">
						Find forms, manuals, events, and more.
					</p>
					<div className="mt-4">
						<WelcomeSearch />
					</div>
				</div>
			</section>
		);
	}
}
