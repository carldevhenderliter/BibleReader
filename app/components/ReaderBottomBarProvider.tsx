"use client";

import {
  createContext,
  type Dispatch,
  type PropsWithChildren,
  type ReactNode,
  type SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

type ReaderBottomBarContextValue = {
  bottomBarPanel: ReactNode;
  setBottomBarPanel: Dispatch<SetStateAction<ReactNode>>;
};

const noop = () => {};

const ReaderBottomBarContext = createContext<ReaderBottomBarContextValue>({
  bottomBarPanel: null,
  setBottomBarPanel: noop as Dispatch<SetStateAction<ReactNode>>
});

export function ReaderBottomBarProvider({ children }: PropsWithChildren) {
  const [bottomBarPanel, setBottomBarPanel] = useState<ReactNode>(null);

  const value = useMemo(
    () => ({
      bottomBarPanel,
      setBottomBarPanel
    }),
    [bottomBarPanel]
  );

  return (
    <ReaderBottomBarContext.Provider value={value}>
      {children}
    </ReaderBottomBarContext.Provider>
  );
}

export function useReaderBottomBar() {
  return useContext(ReaderBottomBarContext);
}

export function useRegisterReaderBottomBarPanel(panel: ReactNode) {
  const { setBottomBarPanel } = useReaderBottomBar();

  useEffect(() => {
    setBottomBarPanel(panel);

    return () => {
      setBottomBarPanel(null);
    };
  }, [panel, setBottomBarPanel]);
}
