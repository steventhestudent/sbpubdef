import * as React from 'react';
import type { IPortalCalendarProps } from './IPortalCalendarProps';

export default class PortalCalendar extends React.Component<IPortalCalendarProps> {
    public render(): React.ReactElement<IPortalCalendarProps> {
        const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        // Simple placeholder matrix for one month view
        const weeks = Array.from({ length: 5 }, () => Array.from({ length: 7 }, () => '—'));

        return (
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <h4 className="text-base font-semibold text-slate-800">Calendar / Events / Trainings</h4>
                    <div className="flex items-center gap-2">
                        <button className="rounded-md border border-slate-300 px-2 py-1 text-sm">&larr;</button>
                        <span className="text-sm text-slate-700">October</span>
                        <button className="rounded-md border border-slate-300 px-2 py-1 text-sm">&rarr;</button>
                    </div>
                </header>

                <div className="p-4">
                    <table className="min-w-full border-collapse">
                        <thead>
                        <tr>
                            {days.map(d => (
                                <th key={d} className="px-2 py-1 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">{d}</th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {weeks.map((row, i) => (
                            <tr key={i} className="align-top">
                                {row.map((cell, j) => (
                                    <td key={j} className="h-20 w-36 border border-slate-200 p-2 align-top">
                                        <div className="flex items-start justify-between">
                                            <span className="text-xs text-slate-500">{i * 7 + j + 1}</span>
                                        </div>
                                        <ul className="mt-1 space-y-1">
                                            <li className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-800">Training (placeholder)</li>
                                        </ul>
                                    </td>
                                ))}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    <p className="mt-3 text-xs text-slate-500"><em>Placeholder: Wire to events list; day cells show sample chips.</em></p>
                </div>
            </section>
        );
    }
}
