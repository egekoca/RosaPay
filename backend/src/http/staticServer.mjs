import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

export async function serveStatic({ res, pathname, frontendDir }) {
  const requestPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = normalize(join(frontendDir, requestPath));

  if (!filePath.startsWith(frontendDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    res.writeHead(200, { "content-type": contentTypes[extname(filePath)] || "application/octet-stream" });
    res.end(file);
  } catch {
    const index = await readFile(join(frontendDir, "index.html"));
    res.writeHead(200, { "content-type": contentTypes[".html"] });
    res.end(index);
  }
}
