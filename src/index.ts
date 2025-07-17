#!/usr/bin/env node

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import OpsGenieClient from "./opsgenie-client.js";
import { GetAlertResponse, ListAlertNotesResponse, ListAlertsResponse, Alert, AlertNote, BaseAlert } from "./types.js";

/**
 * OpsGenie MCP Server
 * 
 * This server provides tools and resources for managing OpsGenie alerts
 * through the Model Context Protocol.
 */

// Get API key from environment variable
const apiKey = process.env.OPSGENIE_API_KEY;
if (!apiKey) {
  throw new Error("OPSGENIE_API_KEY environment variable is required");
}

// Create OpsGenie client
const opsgenieClient = new OpsGenieClient({ apiKey });

// Create modern MCP server
const server = new McpServer({
  name: "opsgenie-mcp-server",
  version: "1.0.0"
});

// ----------------------
// Resource Registration
// ----------------------

/**
 * Alert details resource - get detailed information about a specific alert
 */
server.registerResource(
  "alert-details",
  new ResourceTemplate("opsgenie://alerts/{alertId}", { list: undefined }),
  {
    title: "Alert Details",
    description: "Detailed information about a specific OpsGenie alert",
    mimeType: "application/json"
  },
  async (uri, { alertId }) => {
    try {
      const alertIdStr = Array.isArray(alertId) ? alertId[0] : alertId;
      if (!alertIdStr) {
        throw new Error("Alert ID is required");
      }
      const response: GetAlertResponse = await opsgenieClient.getAlert(alertIdStr);
      const alert: Alert = response.data;
      
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(alert, null, 2),
          mimeType: "application/json"
        }]
      };
    } catch (error) {
      throw new Error(`Failed to fetch alert details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

/**
 * Alert notes resource - get notes/comments for a specific alert
 */
server.registerResource(
  "alert-notes",
  new ResourceTemplate("opsgenie://alerts/{alertId}/notes", { list: undefined }),
  {
    title: "Alert Notes",
    description: "Notes and comments for a specific OpsGenie alert",
    mimeType: "application/json"
  },
  async (uri, { alertId }) => {
    try {
      const alertIdStr = Array.isArray(alertId) ? alertId[0] : alertId;
      if (!alertIdStr) {
        throw new Error("Alert ID is required");
      }
      const response: ListAlertNotesResponse = await opsgenieClient.getAlertNotes(alertIdStr, { limit: 50 });
      const notes: AlertNote[] = response.data;
      
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(notes, null, 2),
          mimeType: "application/json"
        }]
      };
    } catch (error) {
      throw new Error(`Failed to fetch alert notes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

/**
 * Alert search resource - search for alerts based on query
 */
server.registerResource(
  "alert-search",
  new ResourceTemplate("opsgenie://search?query={query}", { list: undefined }),
  {
    title: "Alert Search",
    description: "Search OpsGenie alerts based on query criteria",
    mimeType: "application/json"
  },
  async (uri, { query }) => {
    try {
      const queryStr = Array.isArray(query) ? query[0] : query;
      if (!queryStr) {
        throw new Error("Query is required");
      }
      const response: ListAlertsResponse = await opsgenieClient.searchAlerts({ 
        query: decodeURIComponent(queryStr),
        limit: 20 
      });
      const alerts: BaseAlert[] = response.data;
      
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(alerts, null, 2),
          mimeType: "application/json"
        }]
      };
    } catch (error) {
      throw new Error(`Failed to search alerts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

/**
 * Recent alerts resource - get recently updated alerts
 */
server.registerResource(
  "recent-alerts",
  "opsgenie://alerts/recent",
  {
    title: "Recent Alerts",
    description: "Recently updated OpsGenie alerts",
    mimeType: "application/json"
  },
  async (uri) => {
    try {
      const response: ListAlertsResponse = await opsgenieClient.searchAlerts({ 
        query: "status:open OR status:acknowledged",
        limit: 25,
        sort: "updatedAt",
        order: "desc"
      });
      const alerts: BaseAlert[] = response.data;
      
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(alerts, null, 2),
          mimeType: "application/json"
        }]
      };
    } catch (error) {
      throw new Error(`Failed to fetch recent alerts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// ----------------------
// Prompt Registration
// ----------------------

/**
 * Incident analysis prompt - analyze an alert for triage and next steps
 */
server.registerPrompt(
  "analyze-incident",
  {
    title: "Analyze Incident",
    description: "Analyze an alert to determine severity, impact, and recommended actions",
    argsSchema: {
      alertId: z.string().describe("The alert identifier to analyze")
    }
  },
  ({ alertId }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Please analyze the OpsGenie alert with ID "${alertId}". 

First, retrieve the alert details and notes using the available tools, then provide:

1. **Severity Assessment**: Based on the alert priority, status, and description
2. **Impact Analysis**: Potential business and technical impact
3. **Root Cause Indicators**: What the alert suggests about underlying issues
4. **Immediate Actions**: What should be done first to address this alert
5. **Escalation Recommendations**: When and to whom this should be escalated

Use the available tools to gather all relevant information about this alert before providing your analysis.`
      }
    }]
  })
);

/**
 * Incident response prompt - guide through incident response workflow
 */
server.registerPrompt(
  "incident-response",
  {
    title: "Incident Response Workflow",
    description: "Guide through a structured incident response process",
    argsSchema: {
      alertId: z.string().describe("The alert identifier for the incident"),
      incidentType: z.string().optional().describe("Type of incident (e.g., 'outage', 'performance', 'security')")
    }
  },
  ({ alertId, incidentType }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Guide me through responding to the incident for alert ID "${alertId}"${incidentType ? ` (incident type: ${incidentType})` : ''}.

Please follow this incident response workflow:

1. **Initial Assessment**
   - Retrieve and analyze the alert details
   - Determine the current status and severity
   - Check if the alert has been acknowledged

2. **Impact Evaluation**
   - Assess the scope and impact of the issue
   - Identify affected systems or users
   - Determine urgency level

3. **Response Actions**
   - Acknowledge the alert if not already done
   - Recommend immediate mitigation steps
   - Suggest who should be involved in resolution

4. **Communication Plan**
   - Determine if stakeholders need to be notified
   - Draft status update if necessary
   - Plan follow-up communications

5. **Next Steps**
   - Create action items for resolution
   - Set up monitoring for the issue
   - Plan post-incident review

Start by gathering all available information about this alert, then guide me through each step.`
      }
    }]
  })
);

/**
 * Alert triage prompt - help prioritize and categorize alerts
 */
server.registerPrompt(
  "triage-alerts",
  {
    title: "Alert Triage",
    description: "Help prioritize and categorize multiple alerts for efficient handling",
    argsSchema: {
      query: z.string().optional().describe("Search query to find alerts to triage (default: open alerts)")
    }
  },
  ({ query = "status:open" }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Help me triage alerts using the query "${query}". 

Please:

1. **Search for Alerts**: Use the search tool to find alerts matching the criteria
2. **Prioritization Matrix**: Group alerts by:
   - High Priority: P1/P2 alerts or critical systems
   - Medium Priority: P3 alerts or important but not critical
   - Low Priority: P4/P5 alerts or informational
3. **Category Analysis**: Group alerts by:
   - System type (database, web service, infrastructure, etc.)
   - Alert pattern (if multiple similar alerts exist)
   - Time-sensitive vs. can-wait items
4. **Action Recommendations**: For each priority group, suggest:
   - Which alerts to handle first
   - Which can be batched together
   - Which might be duplicates or related
5. **Assignment Suggestions**: Recommend which team member types should handle each category

Start by searching for the alerts, then provide the triage analysis.`
      }
    }]
  })
);

/**
 * Post-incident review prompt - structure a post-incident analysis
 */
server.registerPrompt(
  "post-incident-review",
  {
    title: "Post-Incident Review",
    description: "Structure a comprehensive post-incident review and analysis",
    argsSchema: {
      alertId: z.string().describe("The alert identifier for the resolved incident"),
      resolutionSummary: z.string().optional().describe("Brief summary of how the incident was resolved")
    }
  },
  ({ alertId, resolutionSummary }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Conduct a post-incident review for alert ID "${alertId}"${resolutionSummary ? ` which was resolved: ${resolutionSummary}` : ''}.

Please structure a comprehensive post-incident review:

1. **Incident Summary**
   - Retrieve the alert details and timeline
   - Document what happened and when
   - Note the duration and impact

2. **Timeline Analysis**
   - When was the issue first detected?
   - When was it acknowledged and by whom?
   - What were the key milestones in resolution?

3. **Root Cause Analysis**
   - What was the underlying cause?
   - What contributing factors were involved?
   - Were there warning signs that were missed?

4. **Response Evaluation**
   - What went well in the response?
   - What could have been handled better?
   - Were the right people involved quickly enough?

5. **Process Improvements**
   - What monitoring gaps were identified?
   - What process changes would prevent recurrence?
   - What documentation needs updating?

6. **Action Items**
   - Specific tasks to prevent recurrence
   - Process improvements to implement
   - Monitoring or alerting changes needed

Start by gathering all information about this alert and its resolution.`
      }
    }]
  })
);

// ----------------------
// Tool Registration using Modern API
// ----------------------

/**
 * Get detailed information about a specific alert
 */
server.registerTool(
  "get-alert-details",
  {
    title: "Get Alert Details",
    description: "Fetch comprehensive details for an alert by its identifier",
    inputSchema: {
      identifier: z.string().describe("The alert identifier (full ID, including suffix)")
    }
  },
  async ({ identifier }) => {
    try {
      const response: GetAlertResponse = await opsgenieClient.getAlert(identifier);
      const alert: Alert = response.data;
      
      return {
        content: [
          {
            type: "text",
            text: formatAlertDetails(alert)
          },
          {
            type: "resource_link",
            uri: `opsgenie://alerts/${alert.id}`,
            name: `Alert ${alert.id}`,
            description: `Detailed JSON data for alert ${alert.id}`,
            mimeType: "application/json"
          }
        ]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error fetching alert details: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

/**
 * Get notes/comments for a specific alert
 */
server.registerTool(
  "get-alert-notes",
  {
    title: "Get Alert Notes",
    description: "Fetch notes/comments for an alert",
    inputSchema: {
      identifier: z.string().describe("The alert identifier (full ID, including suffix)"),
      limit: z.number().min(1).max(100).optional().describe("Number of notes to fetch (1-100, default: 10)")
    }
  },
  async ({ identifier, limit = 10 }) => {
    try {
      const response: ListAlertNotesResponse = await opsgenieClient.getAlertNotes(identifier, { limit });
      const notes: AlertNote[] = response.data;
      
      if (!notes || notes.length === 0) {
        return {
          content: [{
            type: "text",
            text: "No notes found for this alert."
          }]
        };
      }
      
      const notesText = notes.map((note, index) =>
        `${index + 1}. ${note.note}\n   By: ${note.owner}\n   Created: ${note.createdAt}`
      ).join('\n\n');
      
      return {
        content: [
          {
            type: "text",
            text: `Notes for alert ${identifier}:\n\n${notesText}`
          },
          {
            type: "resource_link",
            uri: `opsgenie://alerts/${identifier}/notes`,
            name: `Notes for Alert ${identifier}`,
            description: `Complete JSON data for notes on alert ${identifier}`,
            mimeType: "application/json"
          }
        ]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error fetching alert notes: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

/**
 * Search for alerts based on query criteria
 */
server.registerTool(
  "search-alerts",
  {
    title: "Search Alerts",
    description: "Search for alerts using OpsGenie query syntax",
    inputSchema: {
      query: z.string().describe("OpsGenie search query (e.g., 'status:open', 'priority:P1', 'tag:database')"),
      limit: z.number().min(1).max(100).optional().describe("Number of alerts to return (1-100, default: 20)")
    }
  },
  async ({ query, limit = 20 }) => {
    try {
      const response: ListAlertsResponse = await opsgenieClient.searchAlerts({ query, limit });
      const alerts: BaseAlert[] = response.data;
      
      if (!alerts || alerts.length === 0) {
        return {
          content: [{
            type: "text",
            text: `No alerts found matching query: "${query}"`
          }]
        };
      }
      
      const alertsText = alerts.map((alert, index) =>
        `${index + 1}. ${alert.message} (ID: ${alert.id})\n   Status: ${alert.status} | Priority: ${alert.priority}\n   Created: ${alert.createdAt}`
      ).join('\n\n');
      
      return {
        content: [
          {
            type: "text",
            text: `Found ${alerts.length} alerts matching "${query}":\n\n${alertsText}`
          },
          {
            type: "resource_link",
            uri: `opsgenie://search?query=${encodeURIComponent(query)}`,
            name: `Search Results: ${query}`,
            description: `Complete JSON data for alerts matching "${query}"`,
            mimeType: "application/json"
          }
        ]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error searching alerts: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

/**
 * Close an alert
 */
server.registerTool(
  "close-alert",
  {
    title: "Close Alert",
    description: "Close an alert by its identifier",
    inputSchema: {
      identifier: z.string().describe("The alert identifier (full ID, including suffix)"),
      note: z.string().optional().describe("Optional note to add when closing the alert")
    }
  },
  async ({ identifier, note }) => {
    try {
      const response = await opsgenieClient.closeAlert(identifier, note);
      return {
        content: [{
          type: "text",
          text: `Successfully closed alert ${identifier}. Result: ${response.result || response.data?.result || 'Alert closed'}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error closing alert: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

/**
 * Acknowledge an alert
 */
server.registerTool(
  "acknowledge-alert",
  {
    title: "Acknowledge Alert",
    description: "Acknowledge an alert by its identifier",
    inputSchema: {
      identifier: z.string().describe("The alert identifier (full ID, including suffix)"),
      note: z.string().optional().describe("Optional note to add when acknowledging the alert")
    }
  },
  async ({ identifier, note }) => {
    try {
      const response = await opsgenieClient.acknowledgeAlert(identifier, note);
      return {
        content: [{
          type: "text",
          text: `Successfully acknowledged alert ${identifier}. Result: ${response.result || response.data?.result || 'Alert acknowledged'}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error acknowledging alert: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

/**
 * Create a new alert
 */
server.registerTool(
  "create-alert",
  {
    title: "Create Alert",
    description: "Create a new alert in OpsGenie",
    inputSchema: {
      message: z.string().describe("Alert message/title"),
      description: z.string().optional().describe("Detailed description of the alert"),
      priority: z.enum(["P1", "P2", "P3", "P4", "P5"]).optional().describe("Alert priority (P1=Critical, P5=Informational)"),
      tags: z.array(z.string()).optional().describe("Array of tags to add to the alert"),
      alias: z.string().optional().describe("Unique alert alias for deduplication"),
      entity: z.string().optional().describe("Entity field (e.g., hostname, service name)"),
      source: z.string().optional().describe("Source of the alert"),
      note: z.string().optional().describe("Additional note to add to the alert")
    }
  },
  async ({ message, description, priority, tags, alias, entity, source, note }) => {
    try {
      const alertData: any = {
        message,
        ...(description && { description }),
        ...(priority && { priority }),
        ...(tags && { tags }),
        ...(alias && { alias }),
        ...(entity && { entity }),
        ...(source && { source }),
        ...(note && { note })
      };
      
      const response = await opsgenieClient.createAlert(alertData);
      return {
        content: [{
          type: "text",
          text: `Successfully created alert. Alert ID: ${response.data?.alertId || 'N/A'}, Request ID: ${response.requestId}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error creating alert: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

/**
 * Add a note to an alert
 */
server.registerTool(
  "add-note-to-alert",
  {
    title: "Add Note to Alert",
    description: "Add a note/comment to an existing alert",
    inputSchema: {
      identifier: z.string().describe("The alert identifier (full ID, including suffix)"),
      note: z.string().describe("The note content to add to the alert")
    }
  },
  async ({ identifier, note }) => {
    try {
      const response = await opsgenieClient.addNoteToAlert(identifier, { note });
      return {
        content: [{
          type: "text",
          text: `Successfully added note to alert ${identifier}. Request ID: ${response.requestId}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error adding note to alert: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

/**
 * Assign an alert to a responder
 */
server.registerTool(
  "assign-alert",
  {
    title: "Assign Alert",
    description: "Assign an alert to a specific responder (user, team, or escalation)",
    inputSchema: {
      identifier: z.string().describe("The alert identifier (full ID, including suffix)"),
      responderType: z.enum(["user", "team", "escalation"]).describe("Type of responder to assign"),
      responderId: z.string().describe("ID or username/team name of the responder"),
      note: z.string().optional().describe("Optional note to add when assigning the alert")
    }
  },
  async ({ identifier, responderType, responderId, note }) => {
    try {
      const assignData: any = {
        owner: {
          type: responderType,
          id: responderId
        },
        ...(note && { note })
      };
      
      const response = await opsgenieClient.assignAlert(identifier, assignData);
      return {
        content: [{
          type: "text",
          text: `Successfully assigned alert ${identifier} to ${responderType} ${responderId}. Request ID: ${response.requestId}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error assigning alert: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

/**
 * Snooze an alert
 */
server.registerTool(
  "snooze-alert",
  {
    title: "Snooze Alert",
    description: "Snooze an alert until a specified time",
    inputSchema: {
      identifier: z.string().describe("The alert identifier (full ID, including suffix)"),
      endTime: z.string().describe("End time for snooze in ISO 8601 format (e.g., '2024-12-31T23:59:59Z')"),
      note: z.string().optional().describe("Optional note to add when snoozing the alert")
    }
  },
  async ({ identifier, endTime, note }) => {
    try {
      const snoozeData: any = {
        endTime,
        ...(note && { note })
      };
      
      const response = await opsgenieClient.snoozeAlert(identifier, snoozeData);
      return {
        content: [{
          type: "text",
          text: `Successfully snoozed alert ${identifier} until ${endTime}. Request ID: ${response.requestId}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error snoozing alert: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

/**
 * Unacknowledge an alert
 */
server.registerTool(
  "unacknowledge-alert",
  {
    title: "Unacknowledge Alert",
    description: "Remove acknowledgment from an alert",
    inputSchema: {
      identifier: z.string().describe("The alert identifier (full ID, including suffix)"),
      note: z.string().optional().describe("Optional note to add when unacknowledging the alert")
    }
  },
  async ({ identifier, note }) => {
    try {
      const response = await opsgenieClient.unacknowledgeAlert(identifier, note);
      return {
        content: [{
          type: "text",
          text: `Successfully unacknowledged alert ${identifier}. Request ID: ${response.requestId}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error unacknowledging alert: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

/**
 * Escalate an alert
 */
server.registerTool(
  "escalate-alert",
  {
    title: "Escalate Alert",
    description: "Escalate an alert to the next escalation level",
    inputSchema: {
      identifier: z.string().describe("The alert identifier (full ID, including suffix)"),
      escalationName: z.string().describe("Name of the escalation policy to escalate to"),
      note: z.string().optional().describe("Optional note to add when escalating the alert")
    }
  },
  async ({ identifier, escalationName, note }) => {
    try {
      const escalationData: any = {
        escalation: { name: escalationName },
        ...(note && { note })
      };
      
      const response = await opsgenieClient.escalateAlert(identifier, escalationData);
      return {
        content: [{
          type: "text",
          text: `Successfully escalated alert ${identifier} to ${escalationName}. Request ID: ${response.requestId}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error escalating alert: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

/**
 * Add tags to an alert
 */
server.registerTool(
  "add-tags-to-alert",
  {
    title: "Add Tags to Alert",
    description: "Add one or more tags to an existing alert",
    inputSchema: {
      identifier: z.string().describe("The alert identifier (full ID, including suffix)"),
      tags: z.array(z.string()).describe("Array of tags to add to the alert"),
      note: z.string().optional().describe("Optional note to add when adding tags")
    }
  },
  async ({ identifier, tags, note }) => {
    try {
      const response = await opsgenieClient.addTagsToAlert(identifier, tags, note);
      return {
        content: [{
          type: "text",
          text: `Successfully added tags [${tags.join(', ')}] to alert ${identifier}. Request ID: ${response.requestId}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error adding tags to alert: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

/**
 * Remove tags from an alert
 */
server.registerTool(
  "remove-tags-from-alert",
  {
    title: "Remove Tags from Alert",
    description: "Remove one or more tags from an existing alert",
    inputSchema: {
      identifier: z.string().describe("The alert identifier (full ID, including suffix)"),
      tags: z.array(z.string()).describe("Array of tags to remove from the alert"),
      note: z.string().optional().describe("Optional note to add when removing tags")
    }
  },
  async ({ identifier, tags, note }) => {
    try {
      const response = await opsgenieClient.removeTagsFromAlert(identifier, tags, note);
      return {
        content: [{
          type: "text",
          text: `Successfully removed tags [${tags.join(', ')}] from alert ${identifier}. Request ID: ${response.requestId}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error removing tags from alert: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

/**
 * Get alert count
 */
server.registerTool(
  "get-alert-count",
  {
    title: "Get Alert Count",
    description: "Get the count of alerts matching specific criteria",
    inputSchema: {
      query: z.string().optional().describe("OpsGenie search query to filter alerts (optional)")
    }
  },
  async ({ query }) => {
    try {
      const response = await opsgenieClient.countAlerts(query ? { query } : {});
      const count = response.data.count;
      
      return {
        content: [{
          type: "text",
          text: query 
            ? `Found ${count} alerts matching query "${query}"`
            : `Total alerts: ${count}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error getting alert count: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// ----------------------
// Utility Functions
// ----------------------

/**
 * Format alert details for display
 */
function formatAlertDetails(alert: Alert): string {
  return `Alert Details:
ID: ${alert.id}
Message: ${alert.message || 'N/A'}
Description: ${alert.description || 'N/A'}
Status: ${alert.status || 'N/A'}
Priority: ${alert.priority || 'N/A'}
Created At: ${alert.createdAt || 'N/A'}
Updated At: ${alert.updatedAt || 'N/A'}
Owner: ${alert.owner || 'N/A'}
Tags: ${alert.tags?.join(', ') || 'N/A'}
Responders: ${alert.responders?.map((r) => `${r.type}:${r.id}`).join(', ') || 'N/A'}
Acknowledged: ${alert.acknowledged ? 'Yes' : 'No'}
Is Seen: ${alert.isSeen ? 'Yes' : 'No'}
Snoozed: ${alert.snoozed ? 'Yes' : 'No'}`;
}

// ----------------------
// Start the server
// ----------------------

/**
 * Main function to start the MCP server
 */
async function main(): Promise<void> {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("OpsGenie MCP server started successfully");
  } catch (error) {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
}); 