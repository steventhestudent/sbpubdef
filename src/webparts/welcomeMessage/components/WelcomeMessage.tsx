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
				<div className="rounded-xl border border-slate-800 p-6 shadow-sm bg-[#f3f3f3]">
					<div className="hover:multi-['hover:font-bold;text-green-500']">
						When hovered, text turns red and bold.
					</div>
					<div className="hover:multi-['hover:bg-blue-900;text-pink-900']">
						When hovered, this text is white and the background is
						red.
					</div>
					<h2 className="text-center text-xl font-semibold text-slate-800 hover:(bg-blue-900 text-pink-900)">
						Welcome to the Public Defender Resource Center,{" "}
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
