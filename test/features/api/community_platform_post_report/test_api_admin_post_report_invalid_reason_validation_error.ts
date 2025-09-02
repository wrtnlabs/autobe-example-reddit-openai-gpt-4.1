import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";

/**
 * Validates that the admin post report creation endpoint enforces 'reason'
 * input validation.
 *
 * This test checks two key failure paths:
 *
 * 1. Creating a post report with an empty reason string.
 * 2. Creating a post report with a reason string exceeding 1000 characters.
 *
 * The endpoint must reject both requests and not create a report entity.
 *
 * Steps:
 *
 * 1. Register an admin account (authentication handled automatically).
 * 2. Attempt to create a post report with an empty reason—assert validation
 *    error.
 * 3. Attempt to create a post report with overlong reason—assert validation
 *    error.
 */
export async function test_api_admin_post_report_invalid_reason_validation_error(
  connection: api.IConnection,
) {
  // Step 1: Register an admin account and authenticate
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPlatformAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);

  // Step 2: Compose invalid inputs for 'reason' field
  const invalidInputs: ICommunityPlatformPostReport.ICreate[] = [
    {
      // Valid report_type, but empty reason
      report_type: "spam",
      reason: "",
    },
    {
      // Valid report_type, but reason too long
      report_type: "abuse",
      reason: RandomGenerator.alphabets(1001),
    },
  ];

  // Step 3: For each invalid input, assert the API rejects the request
  for (const input of invalidInputs) {
    await TestValidator.error(
      `should reject report with invalid reason (length: ${input.reason.length})`,
      async () => {
        await api.functional.communityPlatform.admin.posts.reports.create(
          connection,
          {
            postId: typia.random<string & tags.Format<"uuid">>(),
            body: input,
          },
        );
      },
    );
  }
}
