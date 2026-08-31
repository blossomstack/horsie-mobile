import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { isIOS } from "@/theme";
import {
  useAnimatedScrollHandler,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";

/**
 * How far the screen under a header has scrolled.
 *
 * A shared value rather than state: a collapsing app bar reads this on every
 * frame, and a `setState` per frame would re-render the whole list to move a
 * title by a point. The header and the list are siblings under a navigator, so
 * a context is the only place the two can meet.
 *
 * The provider owns both halves — the value and the handler that writes it —
 * because a consumer holding the value would be a consumer that can write to
 * it, and a second writer is how a header ends up tracking the wrong list.
 *
 * iOS does not need any of this; `headerLargeTitle` collapses natively. The
 * hook answers on both platforms so a screen never asks which one it is on.
 */
interface ScreenScroll {
  scrollY: SharedValue<number>;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

const ScrollContext = createContext<ScreenScroll | null>(null);

export function ScreenScrollProvider({ children }: { children: ReactNode }) {
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const value = useMemo(() => ({ scrollY, onScroll }), [scrollY, onScroll]);
  return (
    <ScrollContext.Provider value={value}>{children}</ScrollContext.Provider>
  );
}

/** The offset itself, for whoever draws the chrome. Null outside a provider,
 * which is the honest answer for a screen with no header of its own. */
export function useScrollOffset(): SharedValue<number> | null {
  return useContext(ScrollContext)?.scrollY ?? null;
}

/**
 * What a scrollable spreads onto itself to drive the header above it.
 *
 * Empty on iOS, and not merely as an optimisation: attaching an `onScroll`
 * handler to a `ScrollView` under a `headerLargeTitle` stops the large title
 * being drawn at all. UIKit owns that collapse and wants the scroll view to
 * itself; nothing here needs the offset on iOS anyway.
 */
export function useScreenScroll() {
  const context = useContext(ScrollContext);
  return useMemo(
    () =>
      context && !isIOS
        ? { onScroll: context.onScroll, scrollEventThrottle: 16 }
        : ({} as { onScroll?: undefined; scrollEventThrottle?: undefined }),
    [context],
  );
}
