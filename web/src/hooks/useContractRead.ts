import { useCallback, useEffect, useState } from "react";
import { describeError } from "../chain/client";
import { useContractAddress } from "../state/ContractAddressContext";

export type ReadState<T> =
  | { status: "unconfigured" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; data: T };

/**
 * Generic hook for a single contract view call. Honest by construction:
 * if no contract address is configured it reports "unconfigured" rather
 * than attempting a call against a fabricated address, and a real RPC
 * failure reports "error" with the real message, never a silently empty
 * success.
 */
export function useContractRead<T>(
  fetcher: ((address: `0x${string}`) => Promise<T>) | null,
  deps: unknown[] = []
): ReadState<T> & { refresh: () => void } {
  const { address } = useContractAddress();
  const [state, setState] = useState<ReadState<T>>({ status: "unconfigured" });
  const [tick, setTick] = useState(0);

  const run = useCallback(() => {
    if (!address || !fetcher) {
      setState({ status: "unconfigured" });
      return;
    }
    setState({ status: "loading" });
    fetcher(address as `0x${string}`)
      .then((data) => setState({ status: "ready", data }))
      .catch((err) => setState({ status: "error", error: describeError(err) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, fetcher, ...deps]);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, tick]);

  return { ...state, refresh: () => setTick((t) => t + 1) } as ReadState<T> & { refresh: () => void };
}
