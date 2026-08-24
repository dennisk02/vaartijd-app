import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vereist voor forbidden()/unauthorized() (gebruikt door requireAdmin() en
  // requireAdminScope() in lib/dal.ts) -- zonder deze vlag gooit forbidden()
  // zelf een runtime-fout i.p.v. de forbidden-pagina te renderen. Was tot nu
  // toe nooit opgemerkt omdat alleen echte volledige beheerders deze guards
  // raakten; met scoped admin-rechten wordt dit pad nu ook echt bereikt door
  // niet-geautoriseerde gebruikers.
  experimental: {
    authInterrupts: true,
  },
};

export default nextConfig;
