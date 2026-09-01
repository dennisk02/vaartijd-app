-- Kijktoegang zonder wijzigingsrechten (§6): geldt over alle toegewezen
-- adminScopes heen. Zie lib/dal.ts (requireAdminScopeWrite).
ALTER TABLE "User" ADD COLUMN     "adminViewOnly" BOOLEAN NOT NULL DEFAULT false;
