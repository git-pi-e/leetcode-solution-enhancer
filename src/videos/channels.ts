export interface ChannelPolicy {
  channels: string[];
  target: number;
}

// Preferred channels come first, in this order, one video each. Other channels fill the carousel up to `target`.
export const CHANNEL_POLICY: ChannelPolicy = {
  channels: [
    "@NeetCode",
    "@NeetCodeIO",
    "@codestorywithMIK",
    "@takeUforward",
    "@AlgorithmsMadeEasy",
    "@ARYANMITTAL",
    "@NickWhite",
    "@crackfaang",
    "@techdose4u",
    "@Pepcoding",
    "@KevinNaughtonJr",
    "@Algorithmist",
  ],
  target: 8,
};

export function displayName(handle: string): string {
  return handle.replace(/^@/, "");
}

export function channelKey(handle: string): string {
  return handle.toLowerCase();
}

export function sameHandle(a: string | null, b: string): boolean {
  return a !== null && channelKey(a) === channelKey(b);
}
