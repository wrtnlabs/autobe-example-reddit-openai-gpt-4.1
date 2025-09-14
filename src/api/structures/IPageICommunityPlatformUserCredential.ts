import { IPage } from "./IPage";
import { ICommunityPlatformUserCredential } from "./ICommunityPlatformUserCredential";

export namespace IPageICommunityPlatformUserCredential {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityPlatformUserCredential.ISummary[];
  };
}
