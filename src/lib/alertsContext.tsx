import { createContext, useContext, type ReactNode } from "react";
import { useAirAlerts } from "../hooks/useAirAlerts";

type AlertCtx = ReturnType<typeof useAirAlerts>;

const Ctx = createContext<AlertCtx | null>(null);

export function AirAlertsProvider({ children }: { children: ReactNode }) {
  const value = useAirAlerts();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAirAlertsShared() {
  const v = useContext(Ctx);
  if (!v) return useAirAlerts(); // без провайдера — окремий хук
  return v;
}
