// next/link以外の公開ファイル・通常のa要素にだけ付けます。
// next/linkにはNext.jsがbasePathを付けるため、この関数を使いません。
export function sitePath(path: string) {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
}

export function documentPath(pathname: string) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return basePath && (pathname === basePath || pathname.startsWith(`${basePath}/`))
    ? pathname.slice(basePath.length) || "/" : pathname;
}
