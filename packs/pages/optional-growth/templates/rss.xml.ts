import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { project } from "../generated/project";

export async function GET(context: { site?: URL }) {
  const posts = (await getCollection("blog", ({ data }) => !data.draft && !data.sample)).sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf());
  return rss({
    title: `${project.name} blog`,
    description: project.brief,
    site: context.site ?? new URL("https://starter.invalid"),
    items: posts.map((post) => ({ title: post.data.title, description: post.data.description, pubDate: post.data.publishedAt, link: `/blog/${post.id}/` })),
    customData: "<language>en</language>",
  });
}
