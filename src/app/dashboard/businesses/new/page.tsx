import { createBusinessAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function NewBusinessPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Add Business</h1>
        <p className="text-muted-foreground text-sm">Add a lead manually before checking status or generating a demo.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lead details</CardTitle>
          <CardDescription>Only the business name is required.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createBusinessAction} className="grid gap-5">
            <Field name="name" label="Name" required />
            <div className="grid gap-4 md:grid-cols-2">
              <Field name="category" label="Category" />
              <Field name="phone" label="Phone" />
            </div>
            <Field name="address" label="Address" />
            <div className="grid gap-4 md:grid-cols-2">
              <Field name="city" label="City" />
              <Field name="state" label="State" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field name="email" label="Email" type="email" />
              <Field name="existing_website_url" label="Existing website URL" />
            </div>
            <Field name="source_url" label="Source URL" />
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={5} />
            </div>
            <SubmitButton className="w-fit">Create lead</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ name, label, type = "text", required = false }: { name: string; label: string; type?: string; required?: boolean }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required={required} />
    </div>
  );
}
