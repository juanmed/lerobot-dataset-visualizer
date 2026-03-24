import { redirect } from "next/navigation";

export default async function DatasetRootPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string; dataset: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { org, dataset } = await params;
  const episodeN =
    process.env.EPISODES?.split(/\s+/)
      .map((x) => parseInt(x.trim(), 10))
      .filter((x) => !isNaN(x))[0] ?? 0;

  const qs = new URLSearchParams(
    Object.entries(await searchParams).flatMap(([k, v]) =>
      Array.isArray(v) ? v.map((val) => [k, val]) : v ? [[k, v]] : [],
    ),
  ).toString();

  redirect(`/${org}/${dataset}/episode_${episodeN}${qs ? `?${qs}` : ""}`);
}
