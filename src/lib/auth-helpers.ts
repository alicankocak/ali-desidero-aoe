import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";

export async function requireAdminOrModerator() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { roles: { include: { role: true } } },
  });
  if (!user) return null;

  const roles = new Set(user.roles.map((r) => r.role.name));
  const ok = roles.has("ADMIN") || roles.has("MODERATOR");
  return ok ? user : null;
}
