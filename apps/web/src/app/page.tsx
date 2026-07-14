import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">4EverFootball</h1>
      <p className="max-w-md text-muted-foreground">
        The operating system for football. Competitions, fixtures, live match
        events and stats, all in one platform.
      </p>
      <div className="flex gap-3">
        <Button render={<Link href="/register" />}>Get started</Button>
        <Button render={<Link href="/login" />} variant="outline">
          Log in
        </Button>
      </div>
    </div>
  );
}
