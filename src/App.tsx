import { useEffect, useState } from "react";
import { SCREENS } from "./screens";
import { LockScreen } from "./components/LockScreen";
import { Toast } from "./components/ui";
import { JotsMark } from "./components/JotsMark";
import { C } from "./lib/constants";
import { useStore } from "./store";
import type { Screen } from "./store";

function useWide(): boolean {
  const [wide, setWide] = useState(() => window.matchMedia("(min-width: 900px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const on = () => setWide(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
}

export function App() {
  const { st } = useStore();
  const wide = useWide();

  if (!st.loaded)
    return (
      <div
        className="appShell"
        style={{
          background: C.olive,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              animation: "cjWobble 800ms ease-in-out",
              display: "inline-block",
            }}
          >
            <JotsMark size={80} tile color={C.cream} ground={C.olive} />
          </div>
        </div>
      </div>
    );
  if (st.locked)
    return (
      <>
        <LockScreen />
        <Toast msg={st.toast} />
      </>
    );

  let screen: Screen = st.screen;
  if ((screen === "live" || screen === "post") && !st.active) screen = "home";

  const Cmp = SCREENS[screen] || SCREENS.home;
  const Home = SCREENS.home;
  const Detail = SCREENS.detail;

  // iPad: home + detail breathe side by side; live roast stays phone-sized.
  const sideBySide = wide && (screen === "home" || screen === "detail") && Home && Detail;

  return (
    <>
      <div className="appShell">
        {sideBySide ? (
          <div className="twoCol">
            <div>
              <Home />
            </div>
            <div>
              {st.detailId ? (
                <Detail />
              ) : (
                <div
                  style={{
                    border: `1px dashed ${C.hair}`,
                    borderRadius: 16,
                    padding: 32,
                    textAlign: "center",
                    color: C.muted,
                    fontSize: 13,
                    marginTop: 70,
                  }}
                >
                  Pick a roast from the log to read it here.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="appCol">{Cmp ? <Cmp /> : null}</div>
        )}
      </div>
      <Toast msg={st.toast} />
    </>
  );
}
