import { Post } from "@mattermost/types/posts";
import { isUserPost } from "./isUserPost";

// Function that converts an array of Posts to OpenAI chat completions parameters
export const convertPostsToChatCompletions = (
  posts: Post[],
  systemPrompt: string
): { role: string; content: string }[] => {
  const res = [
    {
      role: "system",
      content: systemPrompt,
    },
    ...posts.map((post) => {
      const role = isUserPost(post) ? "user" : "assistant";
      return {
        role: role,
        content: post.message,
      };
    }),
  ];

  console.log(res);
  return res;
};
