import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcrypt'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const password = await bcrypt.hash('B3stAdm!n2024', 10)

  await prisma.user.upsert({
    where: { email: 'admin@admin.com' },
    update: { password },
    create: {
      email: 'admin@admin.com',
      name: 'Admin',
      password,
    },
  })

  console.log('Seed done — admin@admin.com / B3stAdm!n2024')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
