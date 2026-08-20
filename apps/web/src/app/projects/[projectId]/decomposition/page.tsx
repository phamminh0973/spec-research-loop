import { Step2Workspace } from "@/components/workflow/step2/step2-workspace";

type PageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function DecompositionPage({
  params,
  searchParams,
}: PageProps) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  return (
    <Step2Workspace projectId={projectId} fixtureMode={query.fixture === "1"} />
  );
}
