import { ResearchWorkspace } from "@/components/workflow/research-workspace";

type PageProps = { params: Promise<{ projectId: string }>; searchParams: Promise<{ fixture?: string }> };
export default async function ResearchPage({ params, searchParams }: PageProps) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  return <ResearchWorkspace projectId={projectId} fixtureMode={query.fixture === "1"} />;
}
