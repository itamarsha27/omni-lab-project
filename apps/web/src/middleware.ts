import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Routes that require an authenticated user.
// Pattern syntax: "/dashboard(.*)" matches /dashboard, /dashboard/anything, etc.
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/labs(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    // If unauthenticated, auth.protect() redirects to the sign-in URL.
    // If authenticated, it's a no-op and the page renders normally.
    await auth.protect();
  }
});

// Tells Next.js which paths the middleware should run on.
// We skip static files and Next internals (no point checking auth on a CSS file)
// but always run on API routes.
export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
