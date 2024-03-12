import { Post } from "@mattermost/types/posts";

export const isUserPost = (post: Post): boolean => {
  return (
    post.props["from_bot"] !== "true" &&
    post.props["from_bot"] !== true &&
    post.type === ""
  );
};
