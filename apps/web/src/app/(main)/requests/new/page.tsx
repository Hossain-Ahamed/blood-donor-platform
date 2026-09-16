import { RequestForm } from "../RequestForm";

export default function NewRequestPage() {
  return (
    <div className="container mx-auto p-4 md:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Request Blood</h1>
        <p className="text-muted-foreground mt-2">
          Create a new blood request to find donors near the patient's hospital.
        </p>
      </div>

      <RequestForm />
    </div>
  );
}
