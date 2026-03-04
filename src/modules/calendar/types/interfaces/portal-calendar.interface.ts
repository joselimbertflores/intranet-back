export interface PortalCalendarDto {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  allDay: boolean;
  description?: string;
  location?: string;
  communication?: {
    id: string;
    reference: string;
    code: string;
    type: string;
  };
  isRecurring: boolean;
}
