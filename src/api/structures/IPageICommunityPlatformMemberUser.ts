import { IPage } from "./IPage";
import { ICommunityPlatformMemberUser } from "./ICommunityPlatformMemberUser";

export namespace IPageICommunityPlatformMemberUser {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformMemberUser.ISummary[];
  };
}
