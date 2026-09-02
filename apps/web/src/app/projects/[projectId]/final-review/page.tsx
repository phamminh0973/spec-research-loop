import { FinalReviewWorkspace } from "@/components/workflow/step7-10/final-review-workspace";

type PageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ fixture?: string }>;
};
export default async function FinalReviewPage({
  params,
  searchParams,
}: PageProps) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  return (
    <FinalReviewWorkspace
      projectId={projectId}
      fixtureMode={query.fixture === "1"}
    />
  );
}
