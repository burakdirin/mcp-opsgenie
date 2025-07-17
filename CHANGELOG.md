# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2024-12-29

### Fixed
- Added shebang line to enable proper binary execution via npx
- Fixed repository URL format in package.json

## [1.0.0] - 2024-12-29

### Added
- Initial release of MCP OpsGenie Server
- Complete OpsGenie API integration for alert management
- Tools for alert CRUD operations (create, read, update, delete)
- Tools for alert actions (acknowledge, close, assign, escalate, snooze)
- Tools for alert notes and tags management
- Resources for accessing alert details and search results
- Prompts for incident analysis, response workflows, and triage
- Support for all major OpsGenie alert operations
- Comprehensive TypeScript type definitions
- Full CLI support with npx integration
- Detailed documentation and examples

### Features
- **Tools**: 15 alert management tools
- **Resources**: 4 resource types for structured data access
- **Prompts**: 4 incident response and analysis prompts
- **API Coverage**: Complete OpsGenie v2 API alert endpoints
- **Authentication**: Secure API key-based authentication
- **Error Handling**: Comprehensive error handling and validation
