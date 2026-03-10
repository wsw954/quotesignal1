import PageContainer from "@/components/ui/PageContainer";
import Button from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";

export default function HomePage() {
  return (
    <main className="py-12">
      <PageContainer>
        <div className="space-y-10">
          {/* Hero */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-slate-600">
              QuoteSignal Preview
            </p>

            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Get competing dealer quotes without the hassle.
            </h1>

            <p className="max-w-2xl text-base text-slate-600">
              Tell us the exact vehicle you want. We reach out to qualified
              dealers and return a short list of clear, comparable quotes.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a href="/intake">
                <Button size="lg">Get Quotes</Button>
              </a>

              <a
                href="/intake"
                className="text-sm font-medium text-slate-700 hover:text-slate-900"
              >
                Start with your vehicle details →
              </a>
            </div>
          </div>

          {/* How it works */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>1) Build your request</CardTitle>
                <CardDescription>
                  Select Make, Model, Trim, plus a few preferences.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">
                  The intake form is interactive so you only see valid options.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2) We contact dealers</CardTitle>
                <CardDescription>
                  We send an RFQ to dealers that match your request.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">
                  Dealers reply with their best offer details and availability.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3) You compare quotes</CardTitle>
                <CardDescription>
                  We deliver a short list of the clearest options.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">
                  Enough choice to win, not so much that it becomes noise.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Footer note */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm text-slate-700">
              Your info is used only to request quotes and coordinate responses.
              See{" "}
              <a
                className="font-medium underline underline-offset-4"
                href="/privacy"
              >
                Privacy
              </a>
              .
            </p>
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
