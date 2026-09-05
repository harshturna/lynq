import { BlockList, isIPv4, isIPv6 } from "node:net";

/** Is the client IP inside any of the site's excluded CIDR ranges? */
export function isExcludedIp(ip: string, cidrs: readonly string[]): boolean {
  if (!cidrs.length) return false;
  const family = isIPv4(ip) ? "ipv4" : isIPv6(ip) ? "ipv6" : null;
  if (!family) return false;
  const list = new BlockList();
  for (const cidr of cidrs) {
    const [addr, prefix] = cidr.split("/");
    if (!addr) continue;
    const addrFamily = isIPv4(addr) ? "ipv4" : isIPv6(addr) ? "ipv6" : null;
    if (!addrFamily) continue;
    const bits = prefix
      ? Number.parseInt(prefix, 10)
      : addrFamily === "ipv4"
        ? 32
        : 128;
    try {
      list.addSubnet(addr, bits, addrFamily);
    } catch {
      // a malformed entry in settings must not take the endpoint down
    }
  }
  return list.check(ip, family);
}
