import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import type { IPageICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test that PATCH /communityPlatform/admin/posts/{postId}/reports endpoint
 * denies access for unauthenticated and unauthorized users.
 *
 * This test verifies that admin-level moderation report search is protected
 * by proper authentication and authorization logic. The endpoint must
 * reject access to report listings unless the request is made by an
 * authenticated admin. We validate two explicit denial scenarios:
 *
 * 1. Unauthenticated (guest) request is denied.
 * 2. Request is made with an authenticated but non-admin user (if possible in
 *    system) and is denied.
 *
 * Step-by-step:
 *
 * 1. Generate valid UUID for postId and random report search filters.
 * 2. Call the endpoint with an unauthorized connection (no Authorization
 *    header).
 * 3. Assert that the response is an authorization or access denied error.
 * 4. (Optional: If a non-admin user flow exists, repeat with a non-admin
 *    session.)
 *
 * This ensures strong access control for sensitive admin moderation APIs.
 */
export async function test_api_post_report_admin_search_unauthenticated_access_denied(
  connection: api.IConnection,
) {
  // 1. Prepare test data: valid postId and random report search body
  const postId = typia.random<string & tags.Format<"uuid">>();
  const body = typia.random<ICommunityPlatformPostReport.IRequest>();

  // 2. Construct an unauthenticated connection (clear Authorization if present)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3. Try the PATCH endpoint without authentication, expect error
  await TestValidator.error(
    "admin moderation endpoint must deny unauthenticated access",
    async () => {
      await api.functional.communityPlatform.admin.posts.reports.index(
        unauthConn,
        {
          postId,
          body,
        },
      );
    },
  );

  // (If the system exposes non-admin login APIs,
  //   here you would authenticate as a regular user and verify denial.)
}
