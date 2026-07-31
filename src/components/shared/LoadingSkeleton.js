'use client';

import { cn } from '@/lib/utils';

function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-lg bg-muted/60', className)} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="rounded-xl border bg-card p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <Skeleton className="h-4 w-32" />
        {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 3 }) {
  return (
    <div className="space-y-2 animate-in fade-in duration-150">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
