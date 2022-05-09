import { permissions } from './permissions'
import { APP_SECRET, getUserId } from './utils'
import { compare, hash } from 'bcryptjs'
import { sign } from 'jsonwebtoken'
import { applyMiddleware } from 'graphql-middleware'
import {
  intArg,
  makeSchema,
  nonNull,
  objectType,
  stringArg,
  inputObjectType,
  arg,
  asNexusMethod,
  enumType,
} from 'nexus'
import { DateTimeResolver } from 'graphql-scalars'
import { Context } from './context'

export const DateTime = asNexusMethod(DateTimeResolver, 'date')

const Query = objectType({
  name: 'Query',
  definition(t) {
    t.nonNull.list.nonNull.field('allUsers', {
      type: 'User',
      resolve: (_parent, _args, context: Context) => {
        return context.prisma.user.findMany()
      },
    })

    t.nullable.field('me', {
      type: 'User',
      resolve: (parent, args, context: Context) => {
        const userId = getUserId(context)
        return context.prisma.user.findUnique({
          where: {
            id: Number(userId),
          },
        })
      },
    })

    t.list.field('users', {
      type: 'User',
      resolve: (parent, args, ctx: Context) => {
        return ctx.prisma.user.findMany()
      },
    })

    t.nullable.field('postById', {
      type: 'Post',
      args: {
        id: intArg(),
      },
      resolve: (_parent, args, context: Context) => {
        return context.prisma.post.findUnique({
          where: { id: args.id || undefined },
        })
      },
    })

    t.nonNull.list.nonNull.field('feed', {
      type: 'Post',
      args: {
        searchString: stringArg(),
        skip: intArg(),
        take: intArg(),
        orderBy: arg({
          type: 'PostOrderByUpdatedAtInput',
        }),
      },
      resolve: (_parent, args, context: Context) => {
        const or = args.searchString
          ? {
              OR: [
                { title: { contains: args.searchString } },
                { content: { contains: args.searchString } },
              ],
            }
          : {}

        return context.prisma.post.findMany({
          where: {
            published: true,
            ...or,
          },
          take: args.take || undefined,
          skip: args.skip || undefined,
          orderBy: args.orderBy || undefined,
        })
      },
    })

    t.list.field('draftsByUser', {
      type: 'Post',
      args: {
        userUniqueInput: nonNull(
          arg({
            type: 'UserUniqueInput',
          }),
        ),
      },
      resolve: (_parent, args, context: Context) => {
        return context.prisma.user
          .findUnique({
            where: {
              id: args.userUniqueInput.id || undefined,
              email: args.userUniqueInput.email || undefined,
            },
          })
          .posts({
            where: {
              published: false,
            },
          })
      },
    })
  },
})

const Mutation = objectType({
  name: 'Mutation',
  definition(t) {
    t.field('signup', {
      type: 'AuthPayload',
      args: {
        username: nonNull(stringArg()),
        email: nonNull(stringArg()),
        password: nonNull(stringArg())
      },
      resolve: async (_parent, args, context: Context) => {
        const _username = await context.prisma.user.findUnique({
          where: {
            username: args.username,
          },
        })
        if (_username) {
          throw new Error(
            `The username ${args.username} is already in use, please try another.`,
          )
        }
        const _email = await context.prisma.user.findUnique({
          where: {
            email: args.email,
          },
        })
        if (_email) {
          throw new Error(`The email ${args.email} is already in use.`)
        }
        const hashedPassword = await hash(args.password, 10)
        const user = await context.prisma.user.create({
          data: {
            username: args.username,
            email: args.email,
            password: hashedPassword,
            profile: {create: {}}
          }
        })
        return {
          token: sign({ userId: user.id }, APP_SECRET),
          user,
        }
      },
    })

    t.field('login', {
      type: 'AuthPayload',
      args: {
        username: nonNull(stringArg()),
        password: nonNull(stringArg()),
      },
      resolve: async (_parent, { username, password }, context: Context) => {
        const user = await context.prisma.user.findUnique({
          where: {
            username,
          },
        })
        if (!user) {
          throw new Error(`Cannot find a user with the username ${username}`)
        }
        const passwordValid = await compare(password, user.password)
        if (!passwordValid) {
          throw new Error('Password is incorrect')
        }
        return {
          token: sign({ userId: user.id }, APP_SECRET),
          user,
        }
      },
    })

    t.field('createDraft', {
      type: 'Post',
      args: {
        data: nonNull(
          arg({
            type: 'PostCreateInput',
          }),
        ),
      },
      resolve: (_, args, context: Context) => {
        const userId = getUserId(context)
        return context.prisma.post.create({
          data: {
            title: args.data.title,
            description: args.data.description,
            postImage: args.data.postImage,
            authorId: userId,
          },
        })
      },
    })

    t.field('togglePublishPost', {
      type: 'Post',
      args: {
        id: nonNull(intArg()),
      },
      resolve: async (_, args, context: Context) => {
        try {
          const post = await context.prisma.post.findUnique({
            where: { id: args.id || undefined },
            select: {
              published: true,
            },
          })
          return context.prisma.post.update({
            where: { id: args.id || undefined },
            data: { published: !post?.published },
          })
        } catch (e) {
          throw new Error(
            `Post with ID ${args.id} does not exist in the database.`,
          )
        }
      },
    })

    t.field('incrementPostViewCount', {
      type: 'Post',
      args: {
        id: nonNull(intArg()),
      },
      resolve: (_, args, context: Context) => {
        return context.prisma.post.update({
          where: { id: args.id || undefined },
          data: {
            viewCount: {
              increment: 1,
            },
          },
        })
      },
    })

    t.field('deletePost', {
      type: 'Post',
      args: {
        id: nonNull(intArg()),
      },
      resolve: (_, args, context: Context) => {
        return context.prisma.post.delete({
          where: { id: args.id },
        })
      },
    })

    t.field('createProfile', {
      type: 'Profile',
      args: {
        location: stringArg(),
        profilePhoto: stringArg(),
        profileBG: stringArg(),
        website: stringArg(),
        hiring: nonNull('Boolean'),
        aboutMe: stringArg(),
      },
      resolve: (parent, args, context: Context) => {
        const userId = getUserId(context)
        if (!userId) throw new Error('User could not be authenticated')
        return context.prisma.profile.create({
          data: {
            ...args,
            User: { connect: { id: Number(userId) } },
          },
        })
      },
    })

    t.field('updateProfile', {
      type: 'Profile',
      args: {
        id: intArg(),
        location: stringArg(),
        profilePhoto: stringArg(),
        profileBG: stringArg(),
        website: stringArg(),
        hiring: nonNull('Boolean'),
        aboutMe: stringArg(),
      },
      resolve: (parent, {id, ...args}, context: Context) => {
        const userId = getUserId(context)
        if (!userId) throw new Error('User could not be authenticated. Please log in and try again')

        return context.prisma.profile.update({
          data: {
            ...args
          },
          where: {
            id: Number(id)
          }
        })
      }
    })

  },
})

const User = objectType({
  name: 'User',
  definition(t) {
    t.nonNull.int('id')
    t.string('username')
    t.nonNull.string('email')
    t.field('profile', {
      type: 'Profile',
      resolve: (parent, _, context: Context) => {
        return context.prisma.user
          .findUnique({
            where: { id: parent.id },
          })
          .profile()
      },
    })
    t.nonNull.list.nonNull.field('posts', {
      type: 'Post',
      resolve: (parent, _, context: Context) => {
        return context.prisma.user
          .findUnique({
            where: { id: parent.id || undefined },
          })
          .posts()
      },
    })
  },
})

const Profile = objectType({
  name: 'Profile',
  definition(t) {
    t.nonNull.int('id')
    t.nonNull.field('createdAt', { type: 'DateTime' })
    t.nonNull.field('updatedAt', { type: 'DateTime' })
    t.string('profilePhoto')
    t.string('profileBG')
    t.string('website')
    t.nonNull.boolean('hiring')
    t.string('location')
    t.string('aboutMe')
    t.field('User', {
      type: 'User',
      resolve: (parent, _, context: Context) => {
        return context.prisma.profile
          .findUnique({
            where: { id: parent.id || undefined },
          })
          .User()
      },
    })
  },
})

const Post = objectType({
  name: 'Post',
  definition(t) {
    t.nonNull.int('id')
    t.nonNull.field('createdAt', { type: 'DateTime' })
    t.nonNull.field('updatedAt', { type: 'DateTime' })
    t.nonNull.string('title')
    t.nonNull.string('description')
    t.nonNull.string('postImage')
    t.nonNull.boolean('published')
    t.nonNull.int('viewCount')
    t.field('author', {
      type: 'User',
      resolve: (parent, _, context: Context) => {
        return context.prisma.post
          .findUnique({
            where: { id: parent.id || undefined },
          })
          .author()
      },
    })
  },
})

const SortOrder = enumType({
  name: 'SortOrder',
  members: ['asc', 'desc'],
})

const PostOrderByUpdatedAtInput = inputObjectType({
  name: 'PostOrderByUpdatedAtInput',
  definition(t) {
    t.nonNull.field('updatedAt', { type: 'SortOrder' })
  },
})

const UserUniqueInput = inputObjectType({
  name: 'UserUniqueInput',
  definition(t) {
    t.int('id')
    t.string('email')
  },
})

const PostCreateInput = inputObjectType({
  name: 'PostCreateInput',
  definition(t) {
    t.nonNull.string('title')
    t.nonNull.string('description')
    t.nonNull.string('postImage')
  },
})

const ProfileCreateInput = inputObjectType({
  name: 'ProfileCreateInput',
  definition(t) {
    t.string('profilePhoto')
    t.string('profileBG')
    t.string('website')
    t.nonNull.boolean('hiring')
    t.string('location')
    t.string('aboutMe')
  },
})

const ProfileUpdateInput = inputObjectType({
  name: 'ProfileUpdateInput',
  definition(t) {
    t.string('profilePhoto')
    t.string('profileBG')
    t.string('website')
    t.nonNull.boolean('hiring')
    t.string('location')
    t.string('aboutMe')
  }
})

const UserCreateInput = inputObjectType({
  name: 'UserCreateInput',
  definition(t) {
    t.nonNull.string('email')
    t.nonNull.string('username')
    t.list.nonNull.field('posts', { type: 'PostCreateInput' })
    t.nonNull.field('profile', {type: 'ProfileCreateInput'})
  },
})

const AuthPayload = objectType({
  name: 'AuthPayload',
  definition(t) {
    t.string('token')
    t.field('user', { type: 'User' })
  },
})

const schemaWithoutPermissions = makeSchema({
  types: [
    Query,
    Mutation,
    Post,
    Profile,
    User,
    AuthPayload,
    UserUniqueInput,
    UserCreateInput,
    PostCreateInput,
    ProfileCreateInput,
    ProfileUpdateInput,
    SortOrder,
    PostOrderByUpdatedAtInput,
    DateTime,
  ],
  outputs: {
    schema: __dirname + '/../schema.graphql',
    typegen: __dirname + '/generated/nexus.ts',
  },
  contextType: {
    module: require.resolve('./context'),
    export: 'Context',
  },
  sourceTypes: {
    modules: [
      {
        module: '@prisma/client',
        alias: 'prisma',
      },
    ],
  },
})

export const schema = applyMiddleware(schemaWithoutPermissions, permissions)
