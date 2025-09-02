import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test successful creation of a new post by an authenticated member.
 *
 * 1. Register a member (POST /auth/member/join), which:
 *
 *    - Creates a unique member (email/password/display_name)
 *    - Logs in and obtains authentication context (token in connection)
 * 2. Prepare a new community id (as realistic uuid)
 * 3. Use the authenticated member context to create a post (POST
 *    /communityPlatform/member/posts):
 *
 *    - Required: community_platform_community_id (uuid), title (5-120 chars),
 *         body (10-10000 chars)
 *    - Optional: author_display_name (null or string up to 32 chars)
 * 4. Validate that:
 *
 *    - The operation succeeds (returns ICommunityPlatformPost)
 *    - The returned post entity has the same community id, correct author id,
 *         and input data for title/body/display_name
 *    - Auto-generated fields (id, created_at, updated_at, deleted_at) are
 *         present and properly formatted
 *    - The post is not marked deleted (deleted_at is null/undefined)
 *    - All string constraints are respected by the created entity
 * 5. All fields match expected values and the business flow is logical.
 */
export async function test_api_member_post_create_successful(
  connection: api.IConnection,
) {
  // 1. Register and log in a new member
  const memberInput: ICommunityPlatformMember.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
  };
  const joinResult: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberInput });
  typia.assert(joinResult);
  const { member } = joinResult;

  // 2. Prepare test data for post creation
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Title: Ensure 5-120 chars (5 words, 2-8 chars each yields 10-40 min/max; boundary test is possible but use normal for main test)
  const title = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 10,
  });
  // Body: Ensure 10-10,000 chars (15-25 words, 4-8 chars each)
  const body = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 4,
    wordMax: 8,
  });

  const postInput: ICommunityPlatformPost.ICreate = {
    community_platform_community_id: communityId,
    title,
    body,
    author_display_name: memberInput.display_name,
  };

  // 3. Create the post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: postInput,
    });
  typia.assert(post);

  // 4. Validate response fields
  TestValidator.equals(
    "community id matches",
    post.community_platform_community_id,
    communityId,
  );
  TestValidator.equals(
    "author id matches member",
    post.community_platform_member_id,
    member.id,
  );
  TestValidator.equals("title matches input", post.title, postInput.title);
  TestValidator.equals("body matches input", post.body, postInput.body);
  TestValidator.equals(
    "author display name matches",
    post.author_display_name,
    postInput.author_display_name,
  );

  // 5. Auto-generated fields are present and properly formatted
  typia.assert<string & tags.Format<"uuid">>(post.id);
  typia.assert<string & tags.Format<"date-time">>(post.created_at);
  typia.assert<string & tags.Format<"date-time">>(post.updated_at);

  // 6. Post should not be soft-deleted
  TestValidator.equals("post is not deleted", post.deleted_at, null);

  // 7. String length constraints are respected
  TestValidator.predicate(
    "title length is valid",
    post.title.length >= 5 && post.title.length <= 120,
  );
  TestValidator.predicate(
    "body length is valid",
    post.body.length >= 10 && post.body.length <= 10000,
  );
}
