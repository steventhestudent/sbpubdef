import * as React from "react";
import type { ILopsDirectoryProps } from "./ILopsDirectoryProps";
import { Collapsible } from "@components/Collapsible";

interface IProcedure {
id: number;
title: string;
category: string;
totalSteps: number;
pdfUrl: string;
}

interface IProcedureStep {
procedureId: number;
stepNumber: number;
imageUrl: string;
description: string;
}

const SAMPLE_PROCEDURES: IProcedure[] = [
{
id: 1,
title: "Post-Sentencing Status in e-Defender",
category: "LOP",
totalSteps: 4,
pdfUrl: "/sample-pdfs/post-sentencing-status.pdf"
},
{
id: 2,
title: "Discovery Email Processing",
category: "Reception",
totalSteps: 5,
pdfUrl: "/sample-pdfs/discovery-email-processing.pdf"
},
{
id: 3,
title: "Case Opening Procedures",
category: "LOP",
totalSteps: 6,
pdfUrl: "/sample-pdfs/case-opening.pdf"
},
];

const SAMPLE_STEPS: IProcedureStep[] = [
{ procedureId: 1, stepNumber: 1, imageUrl: "/placeholder-step-1.png", description: "Access the closed case in e-Defender" },
{ procedureId: 1, stepNumber: 2, imageUrl: "/placeholder-step-2.png", description: "Update case status by clicking status in header" },
{ procedureId: 1, stepNumber: 3, imageUrl: "/placeholder-step-3.png", description: "Select 'Post Sentencing' from dropdown" },
{ procedureId: 1, stepNumber: 4, imageUrl: "/placeholder-step-4.png", description: "After matter concluded, change status back to 'Closed'" },
{ procedureId: 2, stepNumber: 1, imageUrl: "/placeholder-step-1.png", description: "Open discovery email from court" },
{ procedureId: 2, stepNumber: 2, imageUrl: "/placeholder-step-2.png", description: "Download all attachments to local drive" },
{ procedureId: 2, stepNumber: 3, imageUrl: "/placeholder-step-3.png", description: "Save documents to case folder in network drive" },
{ procedureId: 2, stepNumber: 4, imageUrl: "/placeholder-step-4.png", description: "Update case notes in e-Defender" },
{ procedureId: 2, stepNumber: 5, imageUrl: "/placeholder-step-5.png", description: "Send notification email to assigned attorney" },
{ procedureId: 3, stepNumber: 1, imageUrl: "/placeholder-step-1.png", description: "Create new case record in e-Defender" },
{ procedureId: 3, stepNumber: 2, imageUrl: "/placeholder-step-2.png", description: "Enter client information and contact details" },
{ procedureId: 3, stepNumber: 3, imageUrl: "/placeholder-step-3.png", description: "Assign case number and case type" },
{ procedureId: 3, stepNumber: 4, imageUrl: "/placeholder-step-4.png", description: "Set initial court date and location" },
{ procedureId: 3, stepNumber: 5, imageUrl: "/placeholder-step-5.png", description: "Notify public defender of new assignment" },
{ procedureId: 3, stepNumber: 6, imageUrl: "/placeholder-step-6.png", description: "Create physical and digital case folders" },
];

export const LopsDirectory: React.FC<ILopsDirectoryProps> = (props) => {
const [procedures, setProcedures] = React.useState<IProcedure[]>([]);
const [search, setSearch] = React.useState("");
const [isLoading, setIsLoading] = React.useState<boolean>(true);
const [selectedProcedure, setSelectedProcedure] = React.useState<IProcedure | null>(null);
const [currentStep, setCurrentStep] = React.useState<number>(1);
const [steps, setSteps] = React.useState<IProcedureStep[]>([]);

React.useEffect(() => {
setTimeout(() => {
setProcedures(SAMPLE_PROCEDURES);
setSteps(SAMPLE_STEPS);
setIsLoading(false);
}, 500);
}, []);

const filtered = React.useMemo(() => {
const term = search.trim().toLowerCase();
if (!term) return procedures;
return procedures.filter((proc) => {
const haystack = [proc.title, proc.category].filter(Boolean).join(" ").toLowerCase();
return haystack.includes(term);
});
}, [search, procedures]);

const currentProcedureSteps = React.useMemo(() => {
if (!selectedProcedure) return [];
return steps.filter(s => s.procedureId === selectedProcedure.id).sort((a, b) => a.stepNumber - b.stepNumber);
}, [selectedProcedure, steps]);

const currentStepData = React.useMemo(() => {
return currentProcedureSteps.find(s => s.stepNumber === currentStep);
}, [currentProcedureSteps, currentStep]);

const handleSelectProcedure = (procedure: IProcedure) => {
setSelectedProcedure(procedure);
setCurrentStep(1);
};

const goToNextStep = () => {
if (selectedProcedure && currentStep < selectedProcedure.totalSteps) {
setCurrentStep(currentStep + 1);
}
};

const goToPreviousStep = () => {
if (currentStep > 1) {
setCurrentStep(currentStep - 1);
}
};

return (
<Collapsible instanceId={props.instanceId} title="LOPS - Legal Office Procedural System">
<div className="p-4 text-sm">
<label className="block text-xs font-medium text-slate-700" htmlFor="lops-search">
Search procedures
</label>
<div className="mt-1 flex gap-2">
<input
id="lops-search"
type="search"
className="w-full rounded-md border border-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
placeholder="Procedure name or category…"
value={search}
onChange={(e) => setSearch(e.target.value)}
/>
</div>
<p className="mt-2 text-xs text-slate-500">
{isLoading ? "Loading procedures…" : selectedProcedure ? `Viewing: ${selectedProcedure.title} - Step ${currentStep} of ${selectedProcedure.totalSteps}` : `${filtered.length} procedures available`}
</p>
{!isLoading && (
<>
{!selectedProcedure ? (
<>
{filtered.length === 0 ? (
<div className="mt-3 rounded-md border border-slate-400 bg-slate-50 px-3 py-2 text-sm text-slate-600">
No procedures match this search.
</div>
) : (
<ul className="mt-3 divide-y divide-slate-400 rounded-md border border-slate-400 bg-white">
{filtered.map((proc) => (
<li key={proc.id} className="px-3 py-2 hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => handleSelectProcedure(proc)}>
<div className="flex items-center justify-between">
<div>
<p className="text-sm font-semibold text-slate-750">{proc.title}</p>
<p className="text-xs text-slate-600 mt-0.5">Category: {proc.category} • {proc.totalSteps} steps</p>
</div>
<span className="text-blue-600 text-xs font-medium">View →</span>
</div>
</li>
))}
</ul>
)}
</>
) : (
<div className="mt-3">
<button onClick={() => setSelectedProcedure(null)} className="mb-2 text-sm text-blue-600 hover:underline">
← Back to procedure list
</button>
<div className="border border-slate-400 rounded-md overflow-hidden bg-white">
<div className="w-full h-64 bg-slate-100 flex items-center justify-center">
{currentStepData ? (
<div className="text-center p-6 w-full">
<div className="w-full h-48 bg-gradient-to-br from-blue-50 to-slate-100 rounded-lg flex items-center justify-center mb-3 border-2 border-dashed border-slate-300">
<div className="text-center px-4">
<p className="text-4xl mb-2">📋</p>
<p className="text-sm font-semibold text-slate-700">Step {currentStep}</p>
<p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">{currentStepData.description}</p>
</div>
</div>
<p className="text-xs text-slate-500 italic">Actual procedure screenshot will appear here</p>
</div>
) : (
<p className="text-slate-500">Loading step...</p>
)}
</div>
<div className="px-4 py-3 bg-slate-50 border-t border-slate-300">
<div className="flex items-center justify-between mb-2">
<button onClick={goToPreviousStep} disabled={currentStep === 1} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors">
← Back
</button>
<span className="text-sm text-slate-600 font-medium">Step {currentStep} of {selectedProcedure.totalSteps}</span>
<button onClick={goToNextStep} disabled={currentStep === selectedProcedure.totalSteps} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors">
Next →
</button>
</div>
<a href={selectedProcedure.pdfUrl} target="_blank" rel="noreferrer" className="block text-center text-blue-600 hover:underline text-xs">
Download full PDF procedure
</a>
</div>
</div>
</div>
)}
<div className="mt-4 rounded-md bg-blue-50 border border-blue-200 p-3">
<p className="text-xs text-blue-800 mb-1">
<strong>Development Preview</strong>
</p>
<div className="text-xs text-blue-600 space-y-1">
<p>• Procedures shown with placeholder images</p>
<p>• Actual screenshots will replace placeholders</p>
<p>• Images stored in SharePoint library</p>
</div>
</div>
</>
)}
</div>
</Collapsible>
);
};

export default LopsDirectory;
