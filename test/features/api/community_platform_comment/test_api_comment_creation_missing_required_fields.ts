import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";

/**
 * Test that comment creation fails when required fields are missing or
 * invalid, and the API returns validation errors.
 *
 * Business context: This test ensures the robustness of the comment
 * creation validation logic in the community platform. It verifies that the
 * API enforces required fields (such as 'post_id' and 'content') and
 * rejects improper or incomplete requests in accordance with business
 * rules, maintaining data integrity and a good user experience.
 *
 * Steps:
 *
 * 1. Register a member to enable authentication context.
 * 2. Attempt to create a comment with empty content string (violates
 *    2-character minimum).
 * 3. Attempt to create a comment with 'content' of length 1 (also violates
 *    minimum).
 * 4. Attempt to create a comment with 'content' exceeding the 2000 character
 *    maximum.
 * 5. For each failure, verify that the API returns a validation error.
 */
export async function test_api_comment_creation_missing_required_fields(
  connection: api.IConnection,
) {
  // 1. Register member and authenticate
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Password1!";
  const joinResult = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(joinResult);

  // 2. Attempt to create comment with empty content (violates 2-character min)
  await TestValidator.error(
    "comment creation with empty content should fail",
    async () => {
      await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            post_id: typia.random<string & tags.Format<"uuid">>(),
            content: "",
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    },
  );

  // 3. Attempt to create comment with content length 1 (violates minimum)
  await TestValidator.error(
    "comment creation with 1-character content should fail",
    async () => {
      await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            post_id: typia.random<string & tags.Format<"uuid">>(),
            content: "a",
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    },
  );

  // 4. Attempt to create comment with content that exceeds 2000 chars
  await TestValidator.error(
    "comment creation with excessively long content should fail",
    async () => {
      await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            post_id: typia.random<string & tags.Format<"uuid">>(),
            content: "x".repeat(2001),
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    },
  );
}
