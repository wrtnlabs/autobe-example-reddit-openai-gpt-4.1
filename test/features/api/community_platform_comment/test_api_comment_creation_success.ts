import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";

/**
 * Test successful creation of a new comment for a post by an authenticated
 * member.
 *
 * 1. Register a member (to establish authentication context and receive JWT
 *    tokens)
 * 2. Create a new post (using the member account) as the target for the
 *    comment
 * 3. Submit a valid comment for that post via the authenticated context
 * 4. Assert that the comment is created with correct fields:
 *
 *    - Comment.author_id is the member ID
 *    - Comment.post_id matches the post ID
 *    - Comment.content matches submitted text (2-2000 chars)
 *    - Comment.edited is false
 *    - Comment has valid timestamps and is not soft-deleted
 * 5. Validate response type with typia.assert, and business logic with
 *    TestValidator
 *
 * Covers: normal creation flow, authentication, field population, and
 * schema validation.
 */
export async function test_api_comment_creation_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10);
  const displayName = RandomGenerator.name();
  const joinOutput = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
      display_name: displayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(joinOutput);
  const member = joinOutput.member;

  // 2. Create a new post using the member context
  // For community_platform_community_id, using a random valid UUID because the context is not detailed
  const communityPlatformCommunityId = typia.random<
    string & tags.Format<"uuid">
  >();
  const postTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 12,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 8,
    sentenceMax: 20,
    wordMin: 3,
    wordMax: 12,
  });
  const postOutput = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: communityPlatformCommunityId,
        title: postTitle,
        body: postBody,
        author_display_name: displayName,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(postOutput);
  const postId = postOutput.id;

  // 3. Submit a valid comment
  const commentContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 20,
  });
  const commentOutput =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: postId,
        content: commentContent,
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(commentOutput);

  // 4. Assert comment fields are correct and business logic holds
  TestValidator.equals(
    "comment author is current member",
    commentOutput.author_id,
    member.id,
  );
  TestValidator.equals(
    "comment refers to correct post",
    commentOutput.post_id,
    postId,
  );
  TestValidator.equals(
    "comment content matches",
    commentOutput.content,
    commentContent,
  );
  TestValidator.equals(
    "comment is not edited on creation",
    commentOutput.edited,
    false,
  );
  TestValidator.equals(
    "comment is not soft-deleted",
    commentOutput.deleted_at,
    null,
  );
  TestValidator.predicate(
    "comment timestamps are valid ISO date-time",
    typeof commentOutput.created_at === "string" &&
      !isNaN(Date.parse(commentOutput.created_at)),
  );
}
