import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@kuipersbeheerbv.nl";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "wijzig-dit-wachtwoord";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin-account bestaat al: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      name: "Beheerder",
      email,
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log(`Admin-account aangemaakt: ${email} / ${password}`);
  console.log("Wijzig dit wachtwoord na de eerste keer inloggen.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
