import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSession";

/**
 * Verify admin cannot view details of a non-existent session by sessionId.
 *
 * This E2E test checks that when an authenticated admin attempts to fetch
 * the details of a session using a sessionId that does not exist, the
 * system returns an appropriate error (such as 404 Not Found) and does not
 * leak any sensitive session or platform information. This ensures that the
 * API properly enforces resource existence validation and maintains
 * audit/security compliance even for authorized admins.
 *
 * Steps:
 *
 * 1. Register a new admin via /auth/admin/join with unique random credentials
 *    to establish authentication context.
 * 2. Attempt to fetch session detail with GET
 *    /communityPlatform/admin/sessions/{sessionId} using a truly random
 *    UUID, guaranteeing non-existence.
 * 3. Validate that the API responds with an error (e.g., not found),
 *    confirming privacy and security boundaries.
 */
export async function test_api_admin_sessions_detail_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new admin with random credentials
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const adminDisplayName: string = RandomGenerator.name();
  const authorized = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(authorized);

  // 2. Attempt to fetch a non-existent session
  const nonExistentSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "Admin receives error when requesting non-existent session detail",
    async () => {
      await api.functional.communityPlatform.admin.sessions.at(connection, {
        sessionId: nonExistentSessionId,
      });
    },
  );
}
