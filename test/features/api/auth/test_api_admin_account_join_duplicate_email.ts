import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate that registering an admin account with a duplicate email is
 * rejected.
 *
 * This test ensures that the platform enforces the unique email constraint
 * for admin accounts. The following steps are performed:
 *
 * 1. Register a new admin account with a randomly generated email address.
 * 2. Attempt to register another admin account using the same email address.
 * 3. Expect the second registration to fail with a duplicate (unique
 *    constraint violation) error.
 * 4. Confirm that no sensitive information (such as password hashes) is ever
 *    returned in the error response.
 *
 * This confirms that duplicate prevention business rules and error response
 * handling are functioning as required.
 */
export async function test_api_admin_account_join_duplicate_email(
  connection: api.IConnection,
) {
  // 1. Register initial admin account
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password = "TestPassword123!";
  const displayName = RandomGenerator.name(2);

  const admin1: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email,
        password,
        display_name: displayName,
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  typia.assert<ICommunityPlatformAdmin.IAuthorized>(admin1);
  TestValidator.equals(
    "first-registered admin email matches input",
    admin1.admin.email,
    email,
  );
  TestValidator.equals(
    "first-registered admin display_name matches",
    admin1.admin.display_name,
    displayName,
  );

  // 2. Attempt to register another admin using the same email
  await TestValidator.error(
    "duplicate admin join with same email must fail",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email,
          password: "Another_Password1!",
          display_name: RandomGenerator.name(3),
        } satisfies ICommunityPlatformAdmin.IJoin,
      });
    },
  );
}
