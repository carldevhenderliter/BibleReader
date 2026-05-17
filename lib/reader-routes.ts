export function isReaderRoutePath(pathname: string | null | undefined) {
  return Boolean(pathname?.startsWith("/read") || pathname?.startsWith("/prototype/reader"));
}

export function isPrototypeReaderRoutePath(pathname: string | null | undefined) {
  return Boolean(pathname?.startsWith("/prototype/reader"));
}
