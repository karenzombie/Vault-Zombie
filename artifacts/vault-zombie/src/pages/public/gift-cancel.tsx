import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function GiftCancelPage() {
  return (
    <div className="min-h-[100dvh] grid place-items-center bg-background text-ink p-6">
      <div className="text-center max-w-md space-y-6">
        <h1 className="font-display text-4xl">Checkout Canceled</h1>
        <p className="text-text-2 text-lg">Your gift purchase was not completed. You have not been charged.</p>
        <div className="flex justify-center gap-4 pt-4">
          <Link href="/">
            <Button variant="outline" size="lg">Return Home</Button>
          </Link>
          <Link href="/gifts/purchase">
            <Button size="lg" className="bg-ink text-parchment hover:bg-ink-2">Try Again</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
