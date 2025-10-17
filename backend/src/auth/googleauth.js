const passport = require('passport');
const { PrismaClient } = require('@prisma/client');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const prisma = new PrismaClient();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_REDIRECT_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await prisma.users.findUnique({
          where: { email: profile.emails[0].value },
        });

        if (!user) {
          user = await prisma.users.create({
            data: {
              name: profile.displayName,
              email: profile.emails[0].value,
              password: 'google-auth',
            },
          });
        }

        return done(null, user);
      } catch (err) {
        console.error('GoogleAuthErr:', err);
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  const user = await prisma.users.findUnique({ where: { id } });
  done(null, user);
});

module.exports = passport;