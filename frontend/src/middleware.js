import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const protectedRoutes = [
  '/dashboard',
  '/calendar',
  '/todo',
  '/settings/details',
  '/settings/password',
  '/settings/billing',
  '/settings/log',
];

const authRoutes = ['/login', '/signup', '/forgot-password', '/update-password'];

export const middleware = async (request) => {
  // Create a response object that can be modified by Supabase
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name, options) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isRouteProtected = protectedRoutes.includes(pathname);

  if (isRouteProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (authRoutes.includes(pathname) && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
};

export const config = {
  matcher: [
    // Ensure your matcher correctly excludes static assets and API routes.
    // Adjusted to common Next.js patterns for static files and images.
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};