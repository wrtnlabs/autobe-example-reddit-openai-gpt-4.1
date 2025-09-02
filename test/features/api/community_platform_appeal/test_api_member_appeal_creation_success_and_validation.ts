import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";

/**
 * E2E: test member appeal creation and input validation.
 *
 * 1. Register a new member with unique credentials to establish authentication
 *    (POST /auth/member/join).
 * 2. Simulate (via random uuid) an admin action ID to appeal against, as the
 *    actual admin action creation is out of scope in current materials.
 * 3. Perform a successful POST /communityPlatform/member/appeals with valid
 *    admin_action_id (uuid), appeal_status ('submitted'), and plausible
 *    decision_reason, verifying response for correct linkage and data.
 * 4. Attempt to submit an appeal with invalid admin_action_id (wrong format),
 *    expecting a validation error.
 * 5. Attempt to submit an appeal with missing admin_action_id, expecting a
 *    validation error by passing undefined using spread omission.
 * 6. Attempt to submit an appeal with invalid appeal_status (illegal value),
 *    expecting a validation error.
 * 7. Attempt to submit an appeal with excessively long decision_reason
 *    (simulate exceeding a 1000 character rationale), expecting a
 *    validation error.
 */
export async function test_api_member_appeal_creation_success_and_validation(
  connection: api.IConnection,
) {
  // 1. Register a new member for authentication and context.
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name();
  const joinOutput = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: displayName,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(joinOutput);
  const member = joinOutput.member;

  // 2. Prepare a simulated admin action ID (uuid)
  const adminActionId = typia.random<string & tags.Format<"uuid">>();

  // 3. Submit valid appeal (success case)
  const decisionReason = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 8,
    wordMax: 15,
  });
  const validAppeal =
    await api.functional.communityPlatform.member.appeals.create(connection, {
      body: {
        admin_action_id: adminActionId,
        appeal_status: "submitted",
        decision_reason: decisionReason,
      } satisfies ICommunityPlatformAppeal.ICreate,
    });
  typia.assert(validAppeal);
  TestValidator.equals(
    "appeal's member correctly linked",
    validAppeal.member_id,
    member.id,
  );
  TestValidator.equals(
    "appeal's admin_action_id correctly linked",
    validAppeal.admin_action_id,
    adminActionId,
  );
  TestValidator.equals(
    "appeal status should be 'submitted' for initial entry",
    validAppeal.appeal_status,
    "submitted",
  );
  TestValidator.equals(
    "decision_reason present and correct",
    validAppeal.decision_reason,
    decisionReason,
  );

  // 4. Invalid admin_action_id (malformed, not a uuid)
  await TestValidator.error(
    "invalid admin_action_id format triggers validation error",
    async () => {
      await api.functional.communityPlatform.member.appeals.create(connection, {
        body: {
          admin_action_id: "INVALID-UUID",
          appeal_status: "submitted",
          decision_reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformAppeal.ICreate,
      });
    },
  );

  // 5. Missing admin_action_id (simulate via explicit undefined through spread omission)
  await TestValidator.error(
    "missing admin_action_id triggers validation error",
    async () => {
      await api.functional.communityPlatform.member.appeals.create(connection, {
        body: {
          // Purposely omit admin_action_id
          ...{
            appeal_status: "submitted",
            decision_reason: RandomGenerator.paragraph({ sentences: 2 }),
          },
        } as unknown as ICommunityPlatformAppeal.ICreate, // Sufficient for negative-path at runtime without breaking type safety
      });
    },
  );

  // 6. Invalid appeal_status value (not recognized by business logic if any enum applies)
  await TestValidator.error(
    "invalid appeal_status value triggers validation error",
    async () => {
      await api.functional.communityPlatform.member.appeals.create(connection, {
        body: {
          admin_action_id: typia.random<string & tags.Format<"uuid">>(),
          appeal_status: "not_a_valid_status",
          decision_reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformAppeal.ICreate,
      });
    },
  );

  // 7. Overlength decision_reason string, simulating a rationale exceeding e.g. 1000 characters
  await TestValidator.error(
    "overlength decision_reason triggers validation error",
    async () => {
      await api.functional.communityPlatform.member.appeals.create(connection, {
        body: {
          admin_action_id: typia.random<string & tags.Format<"uuid">>(),
          appeal_status: "submitted",
          decision_reason: RandomGenerator.paragraph({
            sentences: 250,
            wordMin: 8,
            wordMax: 16,
          }),
        } satisfies ICommunityPlatformAppeal.ICreate,
      });
    },
  );
}
