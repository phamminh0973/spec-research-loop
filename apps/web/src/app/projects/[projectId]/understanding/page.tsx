import { UnderstandingWorkspace } from "@/components/workflow/step1-workspace";

type PageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function UnderstandingPage({
  params,
  searchParams,
}: PageProps) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  return (
    <UnderstandingWorkspace
      projectId={projectId}
      fixtureMode={query.fixture === "1"}
    />
  );
}
