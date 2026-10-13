// The cookie jar behind the mocked cookies() in tests/setup.ts.
const jar = new Map<string, string>();

export function getTestCookie(name: string): string | undefined {
  return jar.get(name);
}

export function setTestCookie(name: string, value: string) {
  jar.set(name, value);
}

export function clearTestCookies() {
  jar.clear();
}
