export interface RequestWithRequester {
  id: string;
  blood_group: string;
  component_type?: string;
  area_name: string;
  hospital_name?: string;
  patient_name?: string;
  patient_age?: number;
  disease?: string;
  patient_note?: string;
  contact_phone?: string;
  urgency?: string;
  units_needed: number;
  units_fulfilled: number;
  status: string;
  created_at: string;
  needed_time?: string;
  expires_at?: string;
  location?: { type: string; coordinates: [number, number] }; // [lng, lat]
  requester?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface RequestWithDistance extends RequestWithRequester {
  distanceKm: number;
  distanceText: string;
}
