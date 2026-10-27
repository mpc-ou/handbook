import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 border border-primary/20">
        <FileQuestion className="size-8" />
      </div>
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
        404 - Page Not Found
      </h1>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">
        The page you are looking for does not exist or has been moved to another location.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Button asChild size="sm">
          <Link href="/">
            <ArrowLeft className="size-4 mr-2" />
            <span>Return to Handbook Home</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}

