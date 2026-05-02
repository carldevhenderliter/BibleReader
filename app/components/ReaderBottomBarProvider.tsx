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
  bottomBarDockControl: ReactNode;
  setBottomBarPanel: Dispatch<SetStateAction<ReactNode>>;
  setBottomBarDockControl: Dispatch<SetStateAction<ReactNode>>;
};

const noop = () => {};

const ReaderBottomBarContext = createContext<ReaderBottomBarContextValue>({
  bottomBarPanel: null,
  bottomBarDockControl: null,
  setBottomBarPanel: noop as Dispatch<SetStateAction<ReactNode>>,
  setBottomBarDockControl: noop as Dispatch<SetStateAction<ReactNode>>
});

export function ReaderBottomBarProvider({ children }: PropsWithChildren) {
  const [bottomBarPanel, setBottomBarPanel] = useState<ReactNode>(null);
  const [bottomBarDockControl, setBottomBarDockControl] = useState<ReactNode>(null);

  const value = useMemo(
    () => ({
      bottomBarPanel,
      bottomBarDockControl,
      setBottomBarPanel,
      setBottomBarDockControl
    }),
    [bottomBarDockControl, bottomBarPanel]
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

export function useRegisterReaderBottomBarDockControl(control: ReactNode) {
  const { setBottomBarDockControl } = useReaderBottomBar();

  useEffect(() => {
    setBottomBarDockControl(control);

    return () => {
      setBottomBarDockControl(null);
    };
  }, [control, setBottomBarDockControl]);
}
