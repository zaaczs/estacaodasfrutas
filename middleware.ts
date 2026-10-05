import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/produtos/:path*",
    "/pedidos/:path*",
    "/estoque/:path*",
    "/clientes/:path*",
    "/listas/:path*",
  ],
};
