const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const User = require('../models/User');

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: `${process.env.SERVER_URL || 'http://localhost:5000'}/api/auth/google/callback`,
        },
        async (_accessToken, _refreshToken, profile, done) => {
            try {
                const email = profile.emails?.[0]?.value;
                if (!email) return done(new Error('No email returned from Google'), null);

                // 1. Try to find by googleId (returning Google user)
                let user = await User.findOne({ googleId: profile.id });

                // 2. Try to find by email (existing email/password account — link it)
                if (!user) {
                    user = await User.findOne({ email });
                    if (user) {
                        user.googleId = profile.id;
                        await user.save();
                        return done(null, { user, isNew: false });
                    }
                }

                // 3. Found existing Google user
                if (user) return done(null, { user, isNew: false });

                // 4. Brand-new user via Google — role will be chosen on the frontend
                user = await User.create({
                    name: profile.displayName || email.split('@')[0],
                    email,
                    googleId: profile.id,
                    role: 'student', // temporary default; frontend will update via /api/auth/set-role
                });

                return done(null, { user, isNew: true });
            } catch (err) {
                return done(err, null);
            }
        }
    )
);

// Passport needs serialize/deserialize even when sessions are minimal
passport.serializeUser((data, done) => done(null, data));
passport.deserializeUser((data, done) => done(null, data));

module.exports = passport;
