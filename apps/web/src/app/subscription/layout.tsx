import type { Metadata } from 'next';

// Checkout return pages are per-session dead ends: they say nothing without
// the parameters Stripe hands back, and indexed they would be thin
// near-duplicates. robots.txt already disallows the path; this is the
// belt-and-braces directive for a crawler that reaches them by link.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function SubscriptionLayout({ children }: LayoutProps<'/subscription'>) {
  return children;
}
