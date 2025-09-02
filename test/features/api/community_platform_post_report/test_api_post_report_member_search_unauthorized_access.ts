import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import type { IPageICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates that unauthenticated users cannot access the member-specific
 * post report search endpoint.
 *
 * Business context: Only authenticated members are allowed to call PATCH
 * /communityPlatform/member/posts/{postId}/reports to search for post
 * reports. This test attempts to access this endpoint without member
 * authentication to confirm that the system properly denies unauthorized
 * access.
 *
 * Test steps:
 *
 * 1. Construct an unauthenticated connection object, ensuring no Authorization
 *    header is present.
 * 2. Generate random valid values for postId (UUID) and for search body
 *    (ICommunityPlatformPostReport.IRequest).
 * 3. Attempt to call
 *    api.functional.communityPlatform.member.posts.reports.index with the
 *    unauthenticated connection.
 * 4. Verify that the call fails with an authentication or authorization error
 *    by asserting TestValidator.error passes.
 *
 * No business data changes, creation, or cleanup is involved in this test.
 */
export async function test_api_post_report_member_search_unauthorized_access(
  connection: api.IConnection,
) {
  // Step 1: Prepare unauthenticated connection by clearing the Authorization header
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 2: Generate random postId and search body
  const postId = typia.random<string & tags.Format<"uuid">>();
  const body = typia.random<ICommunityPlatformPostReport.IRequest>();

  // Step 3 & 4: Attempt the API call and expect authentication/authorization error
  await TestValidator.error(
    "unauthenticated user cannot access PATCH /communityPlatform/member/posts/{postId}/reports",
    async () => {
      await api.functional.communityPlatform.member.posts.reports.index(
        unauthConn,
        { postId, body },
      );
    },
  );
}
