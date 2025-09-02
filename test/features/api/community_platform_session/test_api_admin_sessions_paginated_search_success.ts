import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSession";
import type { IPageICommunityPlatformSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate successful paginated search of platform sessions by an
 * authenticated admin.
 *
 * 1. Create a new admin user using the admin join endpoint (/auth/admin/join).
 *    Capture the admin UUID for filtering.
 * 2. The join operation also authenticates the admin (access token is set in
 *    connection.headers.Authorization automatically).
 * 3. Perform a PATCH request to /communityPlatform/admin/sessions as the
 *    authenticated admin, passing an ICommunityPlatformSession.IRequest
 *    with:
 *
 *    - Pagination (page, limit),
 *    - Filtering (adminId = just-created admin's id),
 *    - Optionally, also test filters for 'activeOnly', 'expiredOnly', dummy
 *         deviceFingerprint/search values,
 *    - Sort (sortBy, direction) combinations ('created_at', 'expires_at', both
 *         asc/desc).
 * 4. Assert successful response (type check and logical status, 200 OK).
 * 5. Validate returned pagination metadata: current page, page size, total
 *    records (should be >=1), and total pages.
 * 6. Assert every session object:
 *
 *    - Community_platform_admin_id must match joined adminId
 *    - Audit fields (created_at, expires_at, etc) must be correctly typed
 *    - JWT and refresh tokens are present (but may not be exposed in non-auth
 *         response)
 *    - Session is not invalidated (for new session).
 *    - Device/browsers fields are string/null.
 * 7. Check ordering of results (sortBy + direction) when multiple sessions
 *    exist.
 * 8. Optionally, try additional searches with different filters (e.g.,
 *    expiredOnly, activeOnly) and assert logic holds (possible edge: as a
 *    new admin, only the login session may exist).
 */
export async function test_api_admin_sessions_paginated_search_success(
  connection: api.IConnection,
) {
  // 1. Admin registration & authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "StrongTestPass!2024";
  const joinResult: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  typia.assert(joinResult);
  const admin = joinResult.admin;

  // 2. Prepare search request: filter by adminId, first page, small limit, sort by created_at DESC
  const req: ICommunityPlatformSession.IRequest = {
    adminId: admin.id,
    page: 1,
    limit: 5,
    sortBy: "created_at",
    direction: "desc",
    activeOnly: true,
  };

  // 3. Search sessions as admin
  const pageResult: IPageICommunityPlatformSession =
    await api.functional.communityPlatform.admin.sessions.index(connection, {
      body: req,
    });
  typia.assert(pageResult);

  // 4. Pagination asserts
  TestValidator.equals("first page", pageResult.pagination.current, 1);
  TestValidator.equals("limit", pageResult.pagination.limit, 5);
  TestValidator.predicate("records >= 1", pageResult.pagination.records >= 1);
  TestValidator.predicate("pages >= 1", pageResult.pagination.pages >= 1);

  // 5. Session entity asserts
  for (const session of pageResult.data) {
    // Each session must be for this admin, not a regular member
    TestValidator.equals(
      "session is for created admin",
      session.community_platform_admin_id,
      admin.id,
    );
    TestValidator.equals(
      "community_platform_member_id is null or undefined",
      session.community_platform_member_id,
      null,
    );
    // JWT and refresh tokens are present
    TestValidator.predicate(
      "session has jwt_token",
      typeof session.jwt_token === "string" && session.jwt_token.length > 0,
    );
    TestValidator.predicate(
      "session has refresh_token",
      typeof session.refresh_token === "string" &&
        session.refresh_token.length > 0,
    );
    // Timestamp fields must be strings in date-time format
    TestValidator.predicate(
      "expires_at is ISO string",
      typeof session.expires_at === "string",
    );
    TestValidator.predicate(
      "created_at is ISO string",
      typeof session.created_at === "string",
    );
    // Not invalidated for brand new session
    TestValidator.equals(
      "invalidated_at is null",
      session.invalidated_at,
      null,
    );
    // Device fingerprint optional
    // No forbidden fields like deleted_at for active session
    TestValidator.equals("deleted_at is null", session.deleted_at, null);
  }

  // 6. Optionally try search with expiredOnly=true, expecting zero or empty results (new admin)
  const reqExpired: ICommunityPlatformSession.IRequest = {
    adminId: admin.id,
    expiredOnly: true,
    page: 1,
    limit: 2,
    sortBy: "expires_at",
    direction: "asc",
  };
  const expiredResult: IPageICommunityPlatformSession =
    await api.functional.communityPlatform.admin.sessions.index(connection, {
      body: reqExpired,
    });
  typia.assert(expiredResult);
  TestValidator.equals(
    "no expired sessions for new admin",
    expiredResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "no data in expired sessions",
    expiredResult.data.length,
    0,
  );
}
