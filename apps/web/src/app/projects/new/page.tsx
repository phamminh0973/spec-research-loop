import { NewProjectWorkspace } from "@/components/workflow/step1/step1-workspace";

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function NewProjectPage({ searchParams }: PageProps) {
  const query = await searchParams;
  return <NewProjectWorkspace fixtureMode={query.fixture === "1"} />;
}
