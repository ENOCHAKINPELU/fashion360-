export interface AppointmentTypeItem {
  id: string;
  name: string;
  color: string;
  defaultDurationMinutes: number;
  isSystem: boolean;
}

export interface AppointmentCustomer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  profilePhotoUrl: string | null;
}

export interface AppointmentStaff {
  id: string;
  name: string | null;
  image: string | null;
}

export interface AppointmentListItem {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  location: string | null;
  notes: string | null;
  recurrenceGroupId: string | null;
  customer: AppointmentCustomer;
  type: AppointmentTypeItem;
  assignedStaff: AppointmentStaff | null;
}
