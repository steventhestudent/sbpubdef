import * as React from "react";
import { IUpcomingEventsProps } from "./IUpcomingEventsProps";

const UpcomingEvents: React.FC<IUpcomingEventsProps> = ({ events }) => {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 px-4 py-3">
        <h4 className="text-base font-semibold text-slate-800">
          Upcoming Events
        </h4>
      </header>

      <div className="overflow-y-auto max-h-96">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Date
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Time
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Event
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Location
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                  No upcoming events found.
                </td>
              </tr>
            )}
            {events.map((event) => {
              const eventDateObj = new Date(event.EventDate);
              const eventDate = eventDateObj.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              const eventTime = eventDateObj.toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              });

              return (
                <tr key={event.Id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-800 whitespace-nowrap">
                    {eventDate}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                    {eventTime}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-800">
                    {event.Title}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {event.Location || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={event.DetailsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-700 hover:underline"
                    >
                      Details
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default UpcomingEvents;
