-- Track when an admin has pushed an announcement email / in-app
-- notification for a given PlatformOffer, plus the number of users
-- it reached. Lets the admin UI disable the "Notify Users" button
-- and show a "Sent on …" timestamp.

ALTER TABLE "platform_offers"
    ADD COLUMN "notifiedAt"    TIMESTAMP(3),
    ADD COLUMN "notifiedCount" INTEGER NOT NULL DEFAULT 0;
