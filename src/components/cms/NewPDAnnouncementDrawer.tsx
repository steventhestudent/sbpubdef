import * as React from "react";

export function NewPDAnnouncementDrawer({
	open,
	onClose,
	onOpenHelp,
	onSubmit,
}: {
	open: boolean;
	onClose: () => void;
	onOpenHelp: () => void;
	onSubmit: (payload: {
		title: string;
		department: string;
		html: string;
	}) => void;
}): JSX.Element {
	const [title, setTitle] = React.useState("");
	const [department, setDepartment] = React.useState("Everyone");
	const editorRef = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		if (open) {
			setTitle("");
			setDepartment("Everyone");
			if (editorRef.current) editorRef.current.innerHTML = "";
		}
	}, [open]);

	if (!open) return <></>;

	function getHtml(): string {
		return editorRef.current?.innerHTML || "";
	}

	// demo-only formatting (OK for placeholder)
	function exec(cmd: string, value?: string): void {
		try {
			document.execCommand(cmd, false, value);
		} catch {
			/* noop */
		}
	}

	function handleSubmit(_action: "draft" | "publish"): void {
		const payload = { title: title.trim(), department, html: getHtml() };
		if (!payload.title) {
			alert("Please enter a title.");
			return;
		}
		if (!payload.html && !confirm("Content is empty. Continue?")) return;
		onSubmit(payload);
	}

	return (
		<div className="fixed inset-0 z-40">
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black/30"
				onClick={onClose}
				aria-hidden="true"
			/>

			{/* Drawer (right). HelpDrawer uses z-50, so it will appear above this if opened */}
			<aside className="absolute right-0 top-0 h-full w-[36rem] overflow-y-auto bg-white shadow-2xl">
				<header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
					<h2 className="text-base font-semibold text-slate-800">
						New PD Announcement
					</h2>
					<div className="flex items-center gap-2">
						<button
							className="rounded-md border border-slate-300 px-2 py-1 text-sm"
							onClick={onOpenHelp}
						>
							Help
						</button>
						<button
							className="rounded-md border border-slate-300 px-2 py-1 text-sm"
							onClick={onClose}
						>
							Close
						</button>
					</div>
				</header>

				<div className="space-y-4 p-4">
					<div>
						<label
							className="block text-sm font-medium text-slate-700"
							htmlFor="ann-title"
						>
							Title
						</label>
						<input
							id="ann-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Announcement title"
							className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
						/>
					</div>

					<div>
						<label
							className="block text-sm font-medium text-slate-700"
							htmlFor="ann-dept"
						>
							PD Department
						</label>
						<select
							id="ann-dept"
							value={department}
							onChange={(e) => setDepartment(e.target.value)}
							className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
						>
							{[
								"Everyone",
								"PD-Intranet",
								"HR",
								"Attorney",
								"LOP",
								"Tech-Team",
							].map((opt) => (
								<option key={opt} value={opt}>
									{opt}
								</option>
							))}
						</select>
					</div>

					{/* Mini toolbar — demo only */}
					<div className="sticky top-0 z-10 flex flex-wrap gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 text-sm">
						<button
							type="button"
							className="rounded border border-slate-300 px-2 py-1"
							onClick={() => exec("bold")}
						>
							<b>B</b>
						</button>
						<button
							type="button"
							className="rounded border border-slate-300 px-2 py-1"
							onClick={() => exec("italic")}
						>
							<i>I</i>
						</button>
						<button
							type="button"
							className="rounded border border-slate-300 px-2 py-1"
							onClick={() => exec("underline")}
						>
							<u>U</u>
						</button>
						<button
							type="button"
							className="rounded border border-slate-300 px-2 py-1"
							onClick={() => {
								const url = prompt("Image URL");
								if (url) exec("insertImage", url);
							}}
						>
							Image
						</button>
						<button
							type="button"
							className="rounded border border-slate-300 px-2 py-1"
							onClick={() => {
								const url = prompt("Link URL");
								if (url) exec("createLink", url);
							}}
						>
							Link
						</button>
					</div>

					{/* Rich text area */}
					<div
						ref={editorRef}
						role="textbox"
						aria-multiline="true"
						contentEditable={true}
						className="min-h-[220px] w-full rounded-md border border-slate-300 p-3 text-sm focus:outline-none"
						suppressContentEditableWarning
					/>

					<div className="flex items-center justify-between pt-2">
						<div className="flex items-center gap-2">
							<button
								className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-white"
								onClick={() => handleSubmit("draft")}
							>
								Save as Draft
							</button>
							<button
								className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
								onClick={() => handleSubmit("publish")}
							>
								Publish
							</button>
						</div>
					</div>
				</div>
			</aside>
		</div>
	);
}
