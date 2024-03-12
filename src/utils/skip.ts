import { Post } from "@mattermost/types/posts";

export function shouldSkip(post: Post) {
  const low = post.message.toLowerCase();

  return low.startsWith("skip ") || low.startsWith("skip\n");
}

export function cleanSkip(post: Post) {
  if (post.message.toLowerCase().startsWith("skip ")) {
    post.message = post.message.slice("skip ".length);
  }
  if (post.message.toLowerCase().startsWith("skip\n")) {
    post.message = post.message.slice("skip\n".length);
  }
  return post;
}
