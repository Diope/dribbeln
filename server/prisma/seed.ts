import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

const userData: Prisma.UserCreateInput[] = [
  {
    username: 'paulosil',
    email: 'alice@prisma.io',
    password: '$2a$10$TLtC603wy85MM./ot/pvEec0w2au6sjPaOmLpLQFbxPdpJH9fDwwS', // myPassword42
    posts: {
      create: [
        {
          title: 'What is Life #4',
          content: 'Who knows lol',
          published: true,
        },
      ],
    },
  },
  {
    username: 'nikka_32',
    email: 'nilu@prisma.io',
    password: '$2a$10$k2rXCFgdmO84Vhkyb6trJ.oH6MYLf141uTPf81w04BImKVqDbBivi', // random42
    posts: {
      create: [
        {
          title: 'HomeTown',
          content: 'Gol',
          published: true,
          viewCount: 42,
        },
      ],
    },
  },
  {
    username: 'kitosis',
    email: 'mahmoud@prisma.io',
    password: '$2a$10$lTlNdIBQvCho0BoQg21KWu/VVKwlYsGwAa5r7ctOV41EKXRQ31ING', // iLikeTurtles42
    posts: {
      create: [
        {
          title: 'Like That',
          content: 'piranas',
          published: true,
          viewCount: 128,
        },
        {
          title: 'Appe Escap',
          content: 'words',
        },
      ],
    },
  },
]

async function main() {
  console.log(`Start seeding ...`)
  for (const u of userData) {
    const user = await prisma.user.create({
      data: u,
    })
    console.log(`Created user with id: ${user.id}`)
  }
  console.log(`Seeding finished.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
