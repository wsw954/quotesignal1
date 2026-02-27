//app/intake/page.js
import PageContainer from "@/components/ui/PageContainer";
import BuyerIntakeForm from "@/components/intake/BuyerIntakeForm";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";

export default function IntakePage() {
  return (
    <main className="py-10">
      <PageContainer>
        <Card>
          <CardHeader>
            <CardTitle>Buyer Intake Form</CardTitle>
            <CardDescription>
              Build your request and we’ll collect competing dealer quotes.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <BuyerIntakeForm />
          </CardContent>
        </Card>
      </PageContainer>
    </main>
  );
}
