import { Link } from "wouter";
import { useAuth } from "@clerk/react";
import { Button } from "@/components/ui/button";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "";

export default function GiftCancelPage() {
  return PUBLISHABLE_KEY ? <AuthAwareGiftCancelPage /> : <GiftCancelPageBody home="/" />;
}

function AuthAwareGiftCancelPage() {
  const { isLoaded, isSignedIn } = useAuth();
  return <GiftCancelPageBody home={isLoaded && isSignedIn ? "/operator" : "/"} />;
}

function GiftCancelPageBody({ home }: { home: string }) {
  return (
    <div className="min-h-[100dvh] grid place-items-center bg-background text-ink p-6">
      <div className="text-center max-w-md space-y-6">
        <h1 className="font-display text-4xl">Checkout Canceled</h1>
        <p className="text-text-2 text-lg">Your gift purchase was not completed. You have not been charged.</p>
        <div className="flex justify-center gap-4 pt-4">
          <Link href={home}>
            <Button variant="outline" size="lg">Return Home</Button>
          </Link>
          <Link href="/gifts/purchase">
            <Button size="lg" className="bg-ink text-primary-foreground hover:bg-ink-2">Try Again</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
