import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";

/**
 * Test that a member cannot file multiple reports for the same post.
 *
 * This test validates that the API enforces business logic to prevent
 * duplicate post reports from the same member. It covers both the
 * successful path (first report creation) and the failure path (second,
 * duplicate report attempt).
 *
 * Steps:
 *
 * 1. Register a new member with unique credentials for testing.
 * 2. Create a new post in a community using this member.
 * 3. As the same member, file a report against the post (should succeed).
 * 4. Attempt to file a second report for the same post (should fail with a
 *    duplication error).
 *
 * The test confirms both the API's correct handling of valid input and
 * enforcement of the "one report per post per member" rule on duplicates.
 */
export async function test_api_post_report_create_duplicate_report_denied(
  connection: api.IConnection,
) {
  // 1. Register a member for context
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberRegister = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "StrongPassword1!",
      display_name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberRegister);
  const member = memberRegister.member;

  // 2. Create a post (must provide a valid community_platform_community_id)
  // For this test, generate a random UUID for a test community (assuming id exists)
  const communityId: string = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: communityId,
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        author_display_name: RandomGenerator.name(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 3. File the first report (should succeed)
  const reportBody: ICommunityPlatformPostReport.ICreate = {
    report_type: RandomGenerator.pick([
      "spam",
      "abuse",
      "off-topic",
      "other",
    ] as const),
    reason: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
  };
  const firstReport =
    await api.functional.communityPlatform.member.posts.reports.create(
      connection,
      {
        postId: post.id,
        body: reportBody,
      },
    );
  typia.assert(firstReport);

  // 4. Attempt to file a duplicate report for the same post (should fail)
  await TestValidator.error(
    "member cannot file duplicate report on same post",
    async () => {
      await api.functional.communityPlatform.member.posts.reports.create(
        connection,
        {
          postId: post.id,
          body: reportBody,
        },
      );
    },
  );
}
