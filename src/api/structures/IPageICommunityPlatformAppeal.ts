import { IPage } from "./IPage";
import { ICommunityPlatformAppeal } from "./ICommunityPlatformAppeal";

export namespace IPageICommunityPlatformAppeal {
  /**
   * Paginated collection of appeal summaries. Contains the list of summary
   * appeal objects and pagination details.
   */
  export type ISummary = {
    pagination: IPage.IPagination;
    data: ICommunityPlatformAppeal.ISummary[];
  };
}
