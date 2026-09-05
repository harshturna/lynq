// Shared by the unit test and the integration test of the SQL twin.
export const HOSTNAME_CASES: [string, string | null][] = [
  ["aivia.byharsh.com", "aivia.byharsh.com"],
  ["https://WWW.Example.com/path?x=1#f", "example.com"],
  ["http://example.com:8080/", "example.com"],
  ["example.com.", "example.com"],
  ["  Example.COM  ", "example.com"],
  ["www.sub.example.com", "sub.example.com"],
  ["", null],
  ["not a host", null],
];
