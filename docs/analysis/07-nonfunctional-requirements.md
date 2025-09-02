# Non-Functional Requirements: Community Platform Backend

## Performance Expectations

### Overview
The community platform must provide a seamless, immediate, and frictionless experience for all users, mirroring standards set by industry leaders in social discussion platforms. To sustain engagement and competitive differentiation, platform speed, responsiveness, and reliability are of utmost business priority.

### System Response Targets (EARS Format)
- THE system SHALL respond to all critical user actions (posting, voting, commenting, joining/leaving) within 1 second for 95% of interactions under normal load.
- WHEN users load the home feed (main content), THE system SHALL return the first 20 posts visible within 1 second at the 95th percentile.
- WHEN users invoke "Load more", THE system SHALL append the next 20 posts within 1 second in 95% of cases.
- WHEN a user votes on a post/comment, THE system SHALL apply and reflect the new vote state/score instantly (within 300 ms perceived by user interface), with backend confirmation following immediately after.
- WHEN a user submits a post or comment, THE system SHALL persist and reflect the content to all relevant feeds/views within 1 second.
- WHEN search is performed (for posts/communities/comments), THE system SHALL return the first 20 matching results within 2 seconds at the 95th percentile.
- THE system SHALL be horizontally scalable to accommodate traffic surges (plan for at least 10,000 concurrent users, 100K daily active users as a minimum design load).
- WHEN request volume temporarily exceeds target, THE system SHALL degrade gracefully, prioritizing critical user actions and displaying clear error/retry cues (see [Error Handling Requirements](./06-error-handling.md)).

### Throughput, Concurrency, and Scalability
- THE system SHALL support at least 20 simultaneous requests per second per region with no significant performance drop for any core function.
- THE system SHALL be designed to scale horizontally for future load increases via stateless components and partitionable workloads when feasible.
- WHERE batch/bulk operations are required (admin/community deletions), THE system SHALL process them such that UI state and user actions remain responsive.

## Session Management

### Session Duration & Expiry (EARS Format)
- THE system SHALL implement user sessions that remain active for 30 days of inactivity ("generously long" is defined as 30 days, extendable if business need dictates).
- WHEN a session expires, THE system SHALL gracefully prompt the user to re-authenticate without losing the current context or visible screen.
- WHEN session re-authentication is completed, THE system SHALL resume any interrupted user action (e.g., post in progress, vote, join) seamlessly.
- THE system SHALL ensure all session tokens are securely generated, stored, and invalidated on logout or when triggered by user/admin action.
- IF multiple device sessions are allowed, THE system SHALL provide tools to list and revoke sessions per user account (see [User Role & Auth Guide](./02-user-roles-and-permissions.md)).

## Formatting and Display Rules

### Time Display (EARS Format)
- THE system SHALL display all times and dates in the end user's local time zone.
- THE system SHALL show time in relative format ("just now", "X minutes ago", "X hours ago", "X days ago") in all user-facing contexts.
- WHEN the difference is less than 1 minute, THE system SHALL use "just now".
- WHEN the difference is 1 to 59 minutes, THE system SHALL use "X minutes ago".
- WHEN the difference is 1 to 23 hours, THE system SHALL use "X hours ago".
- WHEN the difference is 1 to 6 days, THE system SHALL use "X days ago".
- WHEN the difference exceeds 6 days, THE system SHALL display the absolute local date and time.

### Number Abbreviations (EARS Format)
- THE system SHALL abbreviate numbers as follows in all user-visible locations:
  - 1,000 → 1.2k
  - 10,000 → 12.3k
  - 1,000,000 → 1.2m
- THE system SHALL round abbreviated numbers to one decimal place where appropriate.
- WHERE numbers are less than 1,000, THE system SHALL display full value without abbreviation.
- THE system SHALL apply these conventions to votes, comment counts, member counts, and all relevant statistics.

### Standardized Copy and Consistency
- THE system SHALL ensure consistency in time, date, and number formatting in every locale and site context, matching the user's specified regional preferences where possible (see [Functional Requirements](./04-functional-requirements.md)).

## Operational Guarantees

### Platform Uptime and Maintenance
- THE system SHALL achieve at least 99.5% measured uptime per calendar month (excluding announced/planned maintenance windows up to 2 hours per calendar month, scheduled during off-peak).
- WHEN unexpected downtime or degradation occurs, THE system SHALL communicate the status to users within 5 minutes, using banners or popups where possible.
- WHEN operational recovery is completed, THE system SHALL notify users if their actions during the downtime were successful or require retry.

### Data Consistency and UI Guarantees (EARS Format)
- THE system SHALL ensure all user actions (posting, commenting, voting, joining/leaving) are eventually consistent system-wide; any successful action must be visible to all affected users within 2 seconds.
- THE system SHALL enable optimistic UI updates for all interactive actions, with background reconciliation as needed.
- IF critical data (posts, votes, comments) cannot be saved immediately due to a transient error, THEN THE system SHALL queue the action locally and retry until resolved or user logs out (see [Error Handling](./06-error-handling.md)).
- WHEN a system or business rule failure prevents a user operation, THE system SHALL return business-friendly error codes/messages and recommend the correct user recovery flow.
- THE system SHALL guarantee atomicity for create/edit/delete of posts, comments, and communities: either the full operation succeeds or fails, never partial.

### Notification and Escalation
- WHEN system disruptions impact user actions or data visibility, THE system SHALL escalate notifications (in-app) to affected users with status and guidance.

## Cross-Reference to Related Documents
- Full error scenarios and recovery: [Error Handling Requirements](./06-error-handling.md)
- Business logic and integrity: [Business Rules Guide](./05-business-rules.md)
- Feature-level requirements: [Functional Requirements Document](./04-functional-requirements.md)
