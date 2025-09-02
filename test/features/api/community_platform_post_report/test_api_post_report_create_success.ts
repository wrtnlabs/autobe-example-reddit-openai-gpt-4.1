import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";

/**
 * E2E test for successful post report creation by a registered member.
 *
 * This test exercises the end-to-end workflow where a new member joins the
 * community, creates a post, and then files a report about that post. It
 * validates that the API correctly authenticates the user, allows post
 * creation, accepts a valid report reason/type, and returns a complete
 * report entity whose status is 'open' and whose references match the
 * created objects. All response fields are asserted for non-null values and
 * expected formats, using DTO contract constraints throughout.
 *
 * Process:
 *
 * 1. Register and authenticate a new member
 * 2. As this member, create a new community post
 * 3. Prepare a valid report (type, reason) and submit report for the created
 *    post
 * 4. Validate the response contains: status 'open', correct post and reporter
 *    references, and all fields properly populated
 */
export async function test_api_post_report_create_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new member
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10);
  const displayName = RandomGenerator.name();
  const authorized = await api.functional.auth.member.join(connection, {
    body: {
      email,
      password,
      display_name: displayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(authorized);

  // Step 2: Create a new post as this member
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const postTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 12,
  });
  const postBody = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 5,
    wordMax: 14,
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

  // Step 3: Submit a report for the post
  const reportTypes = ["spam", "abuse", "other"] as const;
  const reportType = RandomGenerator.pick(reportTypes);
  const reportReason = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 6,
    wordMax: 18,
  });
  const report =
    await api.functional.communityPlatform.member.posts.reports.create(
      connection,
      {
        postId: post.id,
        body: {
          report_type: reportType,
          reason: reportReason,
        } satisfies ICommunityPlatformPostReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 4: Assert correctness of report properties and linkage
  TestValidator.equals(
    "report is attached to the correct post",
    report.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "report is attached to reporting member",
    report.reported_by_member_id,
    authorized.member.id,
  );
  TestValidator.equals("report status is open", report.status, "open");
  TestValidator.equals(
    "report_type matches input",
    report.report_type,
    reportType,
  );
  TestValidator.equals(
    "report reason matches input",
    report.reason,
    reportReason,
  );
  TestValidator.predicate(
    "report id is non-empty",
    typeof report.id === "string" && report.id.length > 0,
  );
  TestValidator.predicate(
    "report created_at is valid ISO 8601 timestamp",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z?/.test(report.created_at),
  );
  TestValidator.predicate(
    "report updated_at is valid ISO 8601 timestamp",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z?/.test(report.updated_at),
  );
  TestValidator.equals(
    "report admin_id is null or undefined",
    report.admin_id ?? null,
    null,
  );
  TestValidator.equals(
    "report resolution_notes is null or undefined",
    report.resolution_notes ?? null,
    null,
  );
  TestValidator.equals(
    "report resolved_at is null or undefined",
    report.resolved_at ?? null,
    null,
  );
  TestValidator.equals(
    "report deleted_at is null or undefined",
    report.deleted_at ?? null,
    null,
  );
}
