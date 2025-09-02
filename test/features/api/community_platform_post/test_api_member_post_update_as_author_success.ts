import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test successful update of a post by its original author.
 *
 * This scenario covers the business logic where a member who authored a
 * community post can update its mutable fields (title, body,
 * author_display_name), provided all input data passes validation and
 * authorization is correct. Ownership is a prerequisite (only the author
 * can update their post via this endpoint).
 *
 * Test Steps:
 *
 * 1. Register a new community member (and authenticate) using
 *    /auth/member/join.
 * 2. As that member, create a new post via /communityPlatform/member/posts,
 *    storing returned post info (postId, fields, audit info).
 * 3. Prepare new valid update data for title (5–120 chars), body (10–10,000
 *    chars), and author_display_name (max 32 chars or null), ensuring
 *    actual content change.
 * 4. Submit a PUT to /communityPlatform/member/posts/{postId} as the original
 *    author, with the update payload.
 * 5. Verify the response: updated values match input, unchanged fields
 *    (postId, ownership), audit field updated_at is strictly newer than
 *    before, schema compliance holds, and no extraneous changes occurred.
 */
export async function test_api_member_post_update_as_author_success(
  connection: api.IConnection,
) {
  // 1. Register & authenticate as member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const displayName = RandomGenerator.name(1);
  const joinResult = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(12),
      display_name: displayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(joinResult);
  const member = joinResult.member;

  // 2. Create a post as this member
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const originalTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 12,
  });
  const originalBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 16,
    wordMin: 4,
    wordMax: 12,
  });
  const originalAuthorDisplayName = RandomGenerator.name(1);

  const created = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: communityId,
        title: originalTitle,
        body: originalBody,
        author_display_name: originalAuthorDisplayName,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(created);

  // 3. Prepare new valid update data (make sure actually different!)
  const updatedTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 6,
    wordMax: 18,
  });
  const updatedBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 12,
    sentenceMax: 20,
    wordMin: 5,
    wordMax: 14,
  });
  // For diversity, optionally set author_display_name to null (valid case), or a new name; here, choose new value.
  const updatedAuthorDisplayName = RandomGenerator.name(1);

  // 4. Update the post as the author
  const updated = await api.functional.communityPlatform.member.posts.update(
    connection,
    {
      postId: created.id,
      body: {
        title: updatedTitle,
        body: updatedBody,
        author_display_name: updatedAuthorDisplayName,
      } satisfies ICommunityPlatformPost.IUpdate,
    },
  );
  typia.assert(updated);

  // 5. Validate all business rules
  TestValidator.equals("postId is unchanged", updated.id, created.id);
  TestValidator.equals(
    "community_platform_member_id is unchanged",
    updated.community_platform_member_id,
    created.community_platform_member_id,
  );
  TestValidator.equals(
    "community_platform_community_id is unchanged",
    updated.community_platform_community_id,
    created.community_platform_community_id,
  );

  TestValidator.notEquals(
    "title should be updated",
    updated.title,
    created.title,
  );
  TestValidator.equals("title matches update", updated.title, updatedTitle);

  TestValidator.notEquals("body should be updated", updated.body, created.body);
  TestValidator.equals("body matches update", updated.body, updatedBody);

  TestValidator.notEquals(
    "author_display_name should be updated",
    updated.author_display_name,
    created.author_display_name,
  );
  TestValidator.equals(
    "author_display_name matches",
    updated.author_display_name,
    updatedAuthorDisplayName,
  );

  TestValidator.notEquals(
    "updated_at changed",
    updated.updated_at,
    created.updated_at,
  );
  TestValidator.predicate(
    "updated_at is later or equal to created_at",
    new Date(updated.updated_at) >= new Date(created.created_at),
  );

  TestValidator.equals(
    "deleted_at should remain unchanged",
    updated.deleted_at,
    created.deleted_at,
  );
}
