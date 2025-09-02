import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";

/**
 * Validates successful update and persistence of a comment's content.
 *
 * Step-by-step:
 *
 * 1. Register and authenticate a new member (capture credentials and session).
 * 2. Create a new post in the community as this member (needs a valid
 *    community_platform_community_id).
 * 3. Create a comment on the just-created post as the registered member.
 * 4. Update the comment's content using the update endpoint.
 * 5. Verify the response returns the updated content, the edited flag is true,
 *    and the updated_at timestamp is newer.
 * 6. Validate relationships: the post_id and author_id remain the same.
 */
export async function test_api_comment_update_success(
  connection: api.IConnection,
) {
  // 1. Register a new member and authenticate
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10);
  const displayName = RandomGenerator.name();
  const joinResponse = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
      display_name: displayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(joinResponse);
  TestValidator.equals(
    "returned member email matches input",
    joinResponse.member.email,
    email,
  );
  TestValidator.equals(
    "display_name matches",
    joinResponse.member.display_name,
    displayName,
  );

  // 2. Create a post as this member
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const postTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: communityId,
        title: postTitle,
        body: postBody,
        author_display_name: displayName,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals(
    "post community id matches",
    post.community_platform_community_id,
    communityId,
  );
  TestValidator.equals(
    "author id matches member",
    post.community_platform_member_id,
    joinResponse.member.id,
  );

  // 3. Create a comment as this member
  const commentContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 12,
  });
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        content: commentContent,
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  TestValidator.equals(
    "comment author id matches member",
    comment.author_id,
    joinResponse.member.id,
  );
  TestValidator.equals(
    "comment post id matches post",
    comment.post_id,
    post.id,
  );
  TestValidator.equals(
    "comment content matches input",
    comment.content,
    commentContent,
  );
  TestValidator.predicate(
    "comment is not edited initially",
    comment.edited === false,
  );

  // 4. Update the comment's content (edit as author)
  const updatedContent = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 6,
    wordMax: 10,
  });
  const updated = await api.functional.communityPlatform.member.comments.update(
    connection,
    {
      commentId: comment.id,
      body: {
        content: updatedContent,
      } satisfies ICommunityPlatformComment.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "updated comment id matches original",
    updated.id,
    comment.id,
  );
  TestValidator.equals(
    "updated content is applied",
    updated.content,
    updatedContent,
  );
  TestValidator.equals(
    "updated comment post_id is unchanged",
    updated.post_id,
    post.id,
  );
  TestValidator.equals(
    "updated author_id is unchanged",
    updated.author_id,
    joinResponse.member.id,
  );
  TestValidator.predicate("edited flag is now true", updated.edited === true);
  TestValidator.predicate(
    "updated_at field is now newer",
    new Date(updated.updated_at) > new Date(comment.updated_at),
  );
}
