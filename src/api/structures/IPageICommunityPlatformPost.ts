import { IPage } from "./IPage";
import { ICommunityPlatformPost } from "./ICommunityPlatformPost";

export namespace IPageICommunityPlatformPost {
  /**
   * Paginated collection of post summary objects. Returns multiple post
   * summary records with pagination information. Used for feed/list views,
   * provides lightweight details for each post.
   */
  export type ISummary = {
    pagination: IPage.IPagination;
    data: ICommunityPlatformPost.ISummary[];
  };
}
