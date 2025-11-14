export interface ISharePointEventItem {
  Id: number;
  Title: string;
  EventDate: string;
  Location?: string;
}

export interface IEventItem {
  Id: string | number;
  Title: string;
  EventDate: string;
  Location: string;
  DetailsUrl: string;
}

export interface IUpcomingEventsProps {
  events: IEventItem[];
  visibleToGroups: string;
}

export interface IGraphGroup {
  displayName: string;
  id: string;
}

export interface IGraphEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName?: string };
  webLink?: string;
}
