import { Link } from "wouter";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-background text-foreground">
      <div className="text-center max-w-md px-6">
        <h1 className="font-display text-5xl font-bold mb-4 text-ink">404</h1>
        <p className="text-muted-foreground text-lg mb-8">
          We couldn't find the page you were looking for. It might have been moved or the link might be broken.
        </p>
        <Link href="/" className={cn(buttonVariants({ variant: "pop", size: "lg" }))}>
          Return Home
        </Link>
      </div>
    </div>
  );
}
