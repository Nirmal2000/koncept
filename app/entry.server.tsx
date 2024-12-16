import { RemixServer } from "@remix-run/react";
import { createContentSecurityPolicy } from "@shopify/hydrogen";
import type { AppLoadContext, EntryContext } from "@shopify/remix-oxygen";
import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";

import { getWeaverseCsp } from "~/weaverse/csp";

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  context: AppLoadContext,
) {
  const existingCSP: {
    [x: string]: string | boolean | string[];
  } = getWeaverseCsp(request, context);

  const { nonce, header, NonceProvider } = createContentSecurityPolicy({
    ...existingCSP,
    connectSrc: [
      ...new Set([
        ...(Array.isArray(existingCSP.connectSrc) ? existingCSP.connectSrc : []),
        "'self'",
        "https://monorail-edge.shopifysvc.com",
        context.env.PUBLIC_STORE_DOMAIN || "",
        "https://queue.fal.run",
        "https://cf.cjdropshipping.com",
      ]),
    ],
    defaultSrc: [
      ...new Set([
        ...(Array.isArray(existingCSP.defaultSrc) ? existingCSP.defaultSrc : []),
        "https://cf.cjdropshipping.com",
        "https://v3.fal.media/",
        "https://oss-cf.cjdropshipping.com/",
        "https://studio.weaverse.io/",
      ]),
    ],
    fontSrc: [
      ...new Set([
        ...(Array.isArray(existingCSP.fontSrc) ? existingCSP.fontSrc : []),
        "'self'",
        "https://fonts.gstatic.com",
        "data:",
      ]),
    ],
  });

  const body = await renderToReadableStream(
    <NonceProvider>
      <RemixServer context={remixContext} url={request.url} />
    </NonceProvider>,
    {
      nonce,
      signal: request.signal,
      onError(error) {
        console.error(error);
        responseStatusCode = 500;
      },
    },
  );

  if (isbot(request.headers.get("user-agent"))) {
    await body.allReady;
  }

  responseHeaders.set("Content-Type", "text/html");
  responseHeaders.set("Content-Security-Policy-Report-Only", header);

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
