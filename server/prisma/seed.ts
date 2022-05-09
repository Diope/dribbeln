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
          description: 'Who knows lol',
          published: true,
          postImage: "./seedImage.webp"
        },
      ],
    },
    profile: {
      create: {}
    }
  },
  {
    username: 'nikka_32',
    email: 'nilu@prisma.io',
    password: '$2a$10$k2rXCFgdmO84Vhkyb6trJ.oH6MYLf141uTPf81w04BImKVqDbBivi', // random42
    posts: {
      create: [
        {
          title: 'HomeTown',
          description: 'Uh AHAHA',
          published: true,
          postImage: "./seedImage.webp",
          viewCount: 42,
        },
      ],
    },
    profile: {
      create: {}
    }
  },
  {
    username: 'kitosis',
    email: 'mahmoud@prisma.io',
    password: '$2a$10$lTlNdIBQvCho0BoQg21KWu/VVKwlYsGwAa5r7ctOV41EKXRQ31ING', // iLikeTurtles42
    posts: {
      create: [
        {
          title: 'Like That',
          description: 'piranas',
          postImage: "./seedImage.webp",
          published: true,
          viewCount: 128,
        },
        {
          title: 'Appe Escap',
          description: 'words',
          postImage: "./seedImage.webp"
        },
      ],
    },
    profile: {
      create: {}
    }
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
