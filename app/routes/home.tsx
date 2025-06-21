import { getAuth } from "@clerk/react-router/ssr.server";
import ContentSection from "~/components/homepage/content";
import Footer from "~/components/homepage/footer";
import Integrations from "~/components/homepage/integrations";
import Team from "~/components/homepage/team";
import type { Route } from "./+types/home";

export function meta({ }: Route.MetaArgs) {
  const title = "React Starter Kit - Launch Your SAAS Quickly";
  const description =
    "This powerful starter kit is designed to help you launch your SAAS application quickly and efficiently.";
  const keywords = "React, Starter Kit, SAAS, Launch, Quickly, Efficiently";
  const siteUrl = "https://www.reactstarter.xyz/";
  const imageUrl =
    "https://jdj14ctwppwprnqu.public.blob.vercel-storage.com/rsk-image-FcUcfBMBgsjNLo99j3NhKV64GT2bQl.png";

  return [
    { title },
    {
      name: "description",
      content: description,
    },

    // Open Graph / Facebook
    { property: "og:type", content: "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: imageUrl },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:url", content: siteUrl },
    { property: "og:site_name", content: "React Starter Kit" },
    { property: "og:image", content: imageUrl },

    // Twitter Card
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    {
      name: "twitter:description",
      content: description,
    },
    { name: "twitter:image", content: imageUrl },
    {
      name: "keywords",
      content: keywords,
    },
    { name: "author", content: "Ras Mic" },
    { name: "favicon", content: imageUrl },
  ];
}

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);



  return {
    isSignedIn: !!userId,
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <Integrations loaderData={loaderData} />
      <ContentSection />
      <Team />
      <Footer />
    </>
  );
}
