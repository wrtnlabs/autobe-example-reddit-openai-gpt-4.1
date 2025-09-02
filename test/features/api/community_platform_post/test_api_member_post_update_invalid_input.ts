import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * E2E negative test: Community post update fails on validation error.
 *
 * This function ensures that the PUT
 * /communityPlatform/member/posts/:postId endpoint strictly enforces
 * business input rules, and that invalid update attempts do not modify post
 * data.
 *
 * Steps:
 *
 * 1. Register and log in a member (obtain valid member JWT authentication).
 * 2. Create a valid post in a random community (with valid title and body).
 * 3. Attempt post update with an excessively long title (over 120 chars).
 *
 *    - Expect validation error; confirm post is unchanged.
 * 4. Attempt post update with an empty body (less than 10 chars).
 *
 *    - Expect validation error; confirm post is unchanged.
 * 5. At the end, verify that post data is unchanged compared to the original
 *    (via variables, since GET endpoint is absent).
 */
export async function test_api_member_post_update_invalid_input(
  connection: api.IConnection,
) {
  // 1. Member registration/authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Testing1234" + RandomGenerator.alphaNumeric(4);
  const memberDisplayName = RandomGenerator.name();
  const memberJoin = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: memberDisplayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberJoin);
  const member = memberJoin.member;

  // 2. Create a valid post to operate on
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const originalTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 12,
  });
  const originalBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    wordMin: 4,
    wordMax: 10,
  });
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: communityId,
        title: originalTitle,
        body: originalBody,
        author_display_name: RandomGenerator.name(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 3. Attempt update with excessively long title (e.g., 130 chars)
  const longTitle = RandomGenerator.paragraph({
    sentences: 26,
    wordMin: 5,
    wordMax: 5,
  });
  await TestValidator.error(
    "update should fail when title is too long",
    async () => {
      await api.functional.communityPlatform.member.posts.update(connection, {
        postId: post.id,
        body: {
          title: longTitle,
          body: originalBody,
        } satisfies ICommunityPlatformPost.IUpdate,
      });
    },
  );

  // 4. Attempt update with empty body
  await TestValidator.error(
    "update should fail when body is empty",
    async () => {
      await api.functional.communityPlatform.member.posts.update(connection, {
        postId: post.id,
        body: {
          title: originalTitle,
          body: "",
        } satisfies ICommunityPlatformPost.IUpdate,
      });
    },
  );

  // 5. Confirm post remains unchanged (cannot call GET, so reassert variables)
  typia.assert(post);
  TestValidator.equals(
    "original post title unchanged after failed updates",
    post.title,
    originalTitle,
  );
  TestValidator.equals(
    "original post body unchanged after failed updates",
    post.body,
    originalBody,
  );
}
