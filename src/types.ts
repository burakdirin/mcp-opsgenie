// Types for OpsGenieClient config and params
export interface OpsGenieClientConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface AlertSearchParams {
  query?: string;
  searchIdentifier?: string;
  searchIdentifierType?: string;
  offset?: number;
  limit?: number;
  sort?: string;
  order?: string;
}

export interface AlertCountParams {
  query?: string;
  searchIdentifier?: string;
  searchIdentifierType?: string;
}

export interface AlertNotesParams {
  offset?: string | number;
  direction?: string;
  limit?: number;
  order?: string;
}

// Request types for alert operations
export interface CreateAlertRequest {
  message: string;
  alias?: string;
  description?: string;
  responders?: Responder[];
  visibleTo?: Responder[];
  actions?: string[];
  tags?: string[];
  details?: Record<string, string>;
  entity?: string;
  source?: string;
  priority?: 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
  note?: string;
}

export interface AddNoteRequest {
  note: string;
}

export interface AssignResponderRequest {
  owner: Responder;
  note?: string;
}

export interface SnoozeAlertRequest {
  endTime: string; // ISO 8601 date string
  note?: string;
}

// Swagger-based alert types
export interface Responder {
  type: string;
  id: string;
  name?: string;
}

export interface BaseAlert {
  id: string;
  tinyId?: string;
  alias?: string;
  message?: string;
  status?: string;
  acknowledged?: boolean;
  isSeen?: boolean;
  tags?: string[];
  snoozed?: boolean;
  snoozedUntil?: string;
  count?: number;
  lastOccurredAt?: string;
  createdAt?: string;
  updatedAt?: string;
  source?: string;
  owner?: string;
  priority?: string;
  responders?: Responder[];
  integration?: any;
  report?: any;
}

export interface Alert extends BaseAlert {
  actions?: string[];
  entity?: string;
  description?: string;
  details?: Record<string, string>;
}

export interface AlertNote {
  note: string;
  owner: string;
  createdAt: string;
  offset?: string;
}

export interface ListAlertNotesResponse {
  requestId: string;
  data: AlertNote[];
}

export interface GetAlertResponse {
  requestId: string;
  data: Alert;
}

export interface ListAlertsResponse {
  requestId: string;
  data: BaseAlert[];
  paging?: {
    first?: string;
    next?: string;
  };
}

export interface GetCountAlertsResponse {
  requestId: string;
  data: {
    count: number;
  };
} 