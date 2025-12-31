import { PartNumberBuilder } from "@/components/glenair/part-number-builder";

export default function GlenairPage() {
  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Glenair Tooling</h1>
        <p className="text-muted-foreground">Build Glenair Series 80 part numbers and select compatible contacts.</p>
      </div>
      <PartNumberBuilder />
    </div>
  );
}
