# User Roles and Permissions — Requirement Analysis

## Authentication Overview

THE communityPlatform SHALL require authentication via email and password for any action that modifies platform data (posting, commenting, voting, joining/leaving, creating/deleting communities).

WHEN a guest attempts any write action (post/comment/vote/create/join), THE system SHALL display the message "Please sign in to continue." and SHALL prompt the login flow.

THE system SHALL use JWT (JSON Web Token) authentication for managing sessions. Access tokens SHALL expire after 30 minutes of inactivity and refresh tokens SHALL allow session renewal for up to 30 days from last activity.

WHEN a login session expires, THE system SHALL prompt re-login without interrupting the current context or discarding unsaved user actions.

WHEN a user logs out, THE system SHALL invalidate all active tokens for that device/browser.

WHEN a password reset is initiated, THE system SHALL send a secure, one-time-use reset link to the registered email address. THE system SHALL require new passwords to meet a basic complexity standard (minimum 8 characters, at least one letter and number).


## User Role Definitions and Hierarchy

**Roles:**

1. **guest**
   - Description: Non-authenticated, read-only access to all public content.
   - Capabilities: View sub-communities, posts, and comments. No ability to post, comment, vote, join communities, or create content. Cannot edit or delete any content.

2. **member**
   - Description: Registered, logged-in users with standard participation rights.
   - Capabilities: View, create, edit, and delete their own posts and comments. Join/leave sub-communities. Vote on other users' posts and comments (not their own). Create sub-communities. View all public content. Cannot delete sub-communities (except their own created, if that is allowed). Cannot moderate others.

3. **admin**
   - Description: Privileged users with system-wide oversight.
   - Capabilities: All member permissions. Additionally: delete or edit any post, comment, or sub-community; manage user accounts (suspend, reactivate, reset passwords, remove users as needed); resolve disputes. Full audit trail of all admin actions required. Can override certain business rules for the purpose of moderation or abuse mitigation.

**Role hierarchy:** guest < member < admin (each inherits all permissions from the previous, with only additive rights).


## Permission Matrix

| Action                                      | guest | member | admin |
|---------------------------------------------|:-----:|:------:|:-----:|
| View home feed/posts/comments/communities   |  ✅   |   ✅   |  ✅   |
| Post (create)                               |  ❌   |   ✅   |  ✅   |
| Comment (create)                            |  ❌   |   ✅   |  ✅   |
| Vote (up/down)                              |  ❌   |   ✅   |  ✅   |
| Join/Leave community                        |  ❌   |   ✅   |  ✅   |
| Create sub-community                        |  ❌   |   ✅   |  ✅   |
| Edit/delete own post/comment                |  ❌   |   ✅   |  ✅   |
| Edit/delete own sub-community (if creator)  |  ❌   |   ✅   |  ✅   |
| Edit/delete *any* post/comment              |  ❌   |   ❌   |  ✅   |
| Edit/delete *any* sub-community             |  ❌   |   ❌   |  ✅   |
| Moderate users / enforce rules              |  ❌   |   ❌   |  ✅   |
| Manage user accounts                        |  ❌   |   ❌   |  ✅   |

WHILE authenticated, THE user SHALL only see edit/delete buttons for items they authored, except for admin users who see these controls for all content.

WHEN an action is forbidden by role, THE system SHALL display an appropriate error message (e.g. "You can edit or delete only items you authored." or "No permission").

Admins act as final escalation for all permissions, but with full audit logging for all actions.


## Session and Security Rules

THE system SHALL use JWT tokens to represent session state. JWT payloads SHALL include at minimum: userId, role, and array of permissions, and token expiry.

WHEN a user has multiple sessions (e.g., logged in on multiple devices), THE system SHALL allow concurrent sessions, but logout from one device SHALL not affect others unless "log out everywhere" is used.

WHEN a refresh token expires, THE system SHALL require re-authentication.

THE system SHALL securely store JWT secrets, and not expose them client-side.

All user-sensitive actions SHALL require a valid, non-expired access token in the request. If expired or invalid, THEN THE system SHALL reply with an unauthorized error and trigger the login prompt for interactive UIs.

THE system SHALL provide a mechanism for users to review and revoke all active sessions ("log out everywhere").


## Edge Cases and Special Scenarios

WHEN a member attempts to vote on their own post/comment, THE system SHALL prevent the vote and display "You can’t vote on your own posts/comments."

IF a guest or member attempts to edit/delete content they do not own, THEN THE system SHALL refuse and display "You can edit or delete only items you authored."

WHEN session expiry occurs mid-action (e.g. while composing a post), THE system SHALL persist current input, prompt re-login, and restore input after successful authentication.

WHERE a community is deleted, all posts and comments within SHALL be deleted as well.


## Reference Tables

### Role Capabilities Summary

| Role   | Can View | Can Post | Can Comment | Can Vote | Can Join/Leave | Can Create Community | Can Moderate |
|--------|----------|----------|-------------|----------|----------------|---------------------|--------------|
| guest  |    ✅    |    ❌    |     ❌      |    ❌    |      ❌        |         ❌          |      ❌      |
| member |    ✅    |    ✅    |     ✅      |    ✅    |      ✅        |         ✅          |      ❌      |
| admin  |    ✅    |    ✅    |     ✅      |    ✅    |      ✅        |         ✅          |      ✅      |


### JWT Payload Expectations

Example claims:

```
{
  "userId": "unique-user-id",
  "role": "member", // guest, member, admin
  "permissions": ["post:create","comment:edit","vote:down","mod:all"],
  "exp": 1703872123
}
```

THE system SHALL always validate role and permissions on every endpoint affecting data.


## External References

For overall authentication and session architecture, see [Service Overview Document](./01-service-overview.md).
For complete workflow and process details, see [Functional Requirements Document](./04-functional-requirements.md).
For business rules governing edge permissions, refer to [Business Rules Document](./05-business-rules.md).


---

> *Developer Note: This document defines business requirements only. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*
