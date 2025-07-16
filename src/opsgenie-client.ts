import fetch, { RequestInit } from 'node-fetch';
import {
  OpsGenieClientConfig,
  AlertSearchParams,
  AlertCountParams,
  AlertNotesParams,
  GetAlertResponse,
  ListAlertsResponse,
  GetCountAlertsResponse,
  ListAlertNotesResponse,
  CreateAlertRequest,
  AddNoteRequest,
  AssignResponderRequest,
  SnoozeAlertRequest
} from './types.js';

/**
 * OpsGenie API Client
 * 
 * Provides methods for interacting with the OpsGenie REST API
 * for alert management and incident response.
 */
export default class OpsGenieClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: OpsGenieClientConfig) {
    this.apiKey = config.apiKey.replace(/^GenieKey\s+/, '');
    this.baseUrl = config.baseUrl || 'https://api.opsgenie.com';
  }

  /**
   * Make a request to the OpsGenie API
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `GenieKey ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    };
    const fetchOptions: RequestInit = {
      ...options,
      headers,
    };
    // Only set body if it's provided and is a string
    if (options.body && typeof options.body !== 'string') {
      delete (fetchOptions as any).body;
    }
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpsGenie API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    return response.json() as Promise<T>;
  }

  // ----------------------
  // Alert Retrieval Methods
  // ----------------------

  /**
   * Get a specific alert by identifier
   */
  async getAlert(identifier: string): Promise<GetAlertResponse> {
    return this.request<GetAlertResponse>(`/v2/alerts/${encodeURIComponent(identifier)}?identifierType=id`);
  }

  /**
   * Search for alerts with optional filters
   */
  async searchAlerts(params: AlertSearchParams = {}): Promise<ListAlertsResponse> {
    const search = new URLSearchParams();
    if (params.query) search.append('query', params.query);
    if (params.searchIdentifier) search.append('searchIdentifier', params.searchIdentifier);
    if (params.searchIdentifierType) search.append('searchIdentifierType', params.searchIdentifierType);
    if (params.offset !== undefined) search.append('offset', String(params.offset));
    if (params.limit !== undefined) search.append('limit', String(params.limit));
    if (params.sort) search.append('sort', params.sort);
    if (params.order) search.append('order', params.order);
    return this.request<ListAlertsResponse>(`/v2/alerts?${search.toString()}`);
  }

  /**
   * Get count of alerts matching criteria
   */
  async countAlerts(params: AlertCountParams = {}): Promise<GetCountAlertsResponse> {
    const search = new URLSearchParams();
    if (params.query) search.append('query', params.query);
    if (params.searchIdentifier) search.append('searchIdentifier', params.searchIdentifier);
    if (params.searchIdentifierType) search.append('searchIdentifierType', params.searchIdentifierType);
    return this.request<GetCountAlertsResponse>(`/v2/alerts/count?${search.toString()}`);
  }

  /**
   * Get notes for a specific alert
   */
  async getAlertNotes(identifier: string, params: AlertNotesParams = {}): Promise<ListAlertNotesResponse> {
    const search = new URLSearchParams();
    if (params.offset !== undefined) search.append('offset', String(params.offset));
    if (params.direction) search.append('direction', params.direction);
    if (params.limit !== undefined) search.append('limit', String(params.limit));
    if (params.order) search.append('order', params.order);
    // Always use identifierType=id
    search.append('identifierType', 'id');
    return this.request<ListAlertNotesResponse>(`/v2/alerts/${encodeURIComponent(identifier)}/notes?${search.toString()}`);
  }

  // ----------------------
  // Alert Creation Methods
  // ----------------------

  /**
   * Create a new alert
   */
  async createAlert(alertData: CreateAlertRequest): Promise<any> {
    return this.request<any>('/v2/alerts', {
      method: 'POST',
      body: JSON.stringify(alertData),
    });
  }

  // ----------------------
  // Alert Action Methods
  // ----------------------

  /**
   * Close an alert
   */
  async closeAlert(identifier: string, note?: string): Promise<any> {
    const body: any = {};
    if (note) {
      body.note = note;
    }
    return this.request<any>(`/v2/alerts/${encodeURIComponent(identifier)}/close?identifierType=id`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(identifier: string, note?: string): Promise<any> {
    const body: any = {};
    if (note) {
      body.note = note;
    }
    return this.request<any>(`/v2/alerts/${encodeURIComponent(identifier)}/acknowledge?identifierType=id`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Snooze an alert
   */
  async snoozeAlert(identifier: string, snoozeData: SnoozeAlertRequest): Promise<any> {
    return this.request<any>(`/v2/alerts/${encodeURIComponent(identifier)}/snooze?identifierType=id`, {
      method: 'POST',
      body: JSON.stringify(snoozeData),
    });
  }

  /**
   * Unacknowledge an alert
   */
  async unacknowledgeAlert(identifier: string, note?: string): Promise<any> {
    const body: any = {};
    if (note) {
      body.note = note;
    }
    return this.request<any>(`/v2/alerts/${encodeURIComponent(identifier)}/unacknowledge?identifierType=id`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Assign an alert to responders
   */
  async assignAlert(identifier: string, assignData: AssignResponderRequest): Promise<any> {
    return this.request<any>(`/v2/alerts/${encodeURIComponent(identifier)}/assign?identifierType=id`, {
      method: 'POST',
      body: JSON.stringify(assignData),
    });
  }

  /**
   * Escalate an alert to the next level
   */
  async escalateAlert(identifier: string, escalationData: { escalation: { name: string }; note?: string }): Promise<any> {
    return this.request<any>(`/v2/alerts/${encodeURIComponent(identifier)}/escalate?identifierType=id`, {
      method: 'POST',
      body: JSON.stringify(escalationData),
    });
  }

  // ----------------------
  // Alert Note Methods
  // ----------------------

  /**
   * Add a note to an alert
   */
  async addNoteToAlert(identifier: string, noteData: AddNoteRequest): Promise<any> {
    return this.request<any>(`/v2/alerts/${encodeURIComponent(identifier)}/notes?identifierType=id`, {
      method: 'POST',
      body: JSON.stringify(noteData),
    });
  }

  // ----------------------
  // Alert Tag Methods
  // ----------------------

  /**
   * Add tags to an alert
   */
  async addTagsToAlert(identifier: string, tags: string[], note?: string): Promise<any> {
    const body: any = { tags };
    if (note) {
      body.note = note;
    }
    return this.request<any>(`/v2/alerts/${encodeURIComponent(identifier)}/tags?identifierType=id`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Remove tags from an alert
   */
  async removeTagsFromAlert(identifier: string, tags: string[], note?: string): Promise<any> {
    const body: any = { tags };
    if (note) {
      body.note = note;
    }
    return this.request<any>(`/v2/alerts/${encodeURIComponent(identifier)}/tags?identifierType=id`, {
      method: 'DELETE',
      body: JSON.stringify(body),
    });
  }
} 
