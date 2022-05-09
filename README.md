# Dribbeln

So yea this is just a recreation of dribble features with my own UX/UI, honestly I'm more focused on backend stuff than the frontend so who knows if I'll ever actually get around to it in any real capacity. For the moment the landing page is nearly done being designed, but that's about it. I still need to write up/draw out the system design breakdown.

## Technologies
* GraphQL
* PostgreSQL
* Prisma
* Typescript
* JWT

### Notes
Probably going to replace bcrypt.js with Argon due to security issues, I have no plan to host this but I do like to adhere to best practices.

### Running
* Run `docker compose up` to spin up a postgres DB
* Move to the server directory and run `yarn dev`
* Point your browser to `localhost:4000` to view the graphql endpoint
