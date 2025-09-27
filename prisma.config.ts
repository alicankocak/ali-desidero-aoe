import { defineConfig } from "@prisma/internals";

export default defineConfig({
  schema: "prisma/schema.prisma",
  // seed alanı Prisma config'te GEÇERSİZ. (Prisma 7+)
  // Seeding'i yalnızca lokal geliştirmede npm script ile çalıştır.
});
