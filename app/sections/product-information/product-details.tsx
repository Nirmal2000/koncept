import { Minus, Plus } from "@phosphor-icons/react";
import * as Accordion from "@radix-ui/react-accordion";
import { Link, useLoaderData } from "@remix-run/react";
import clsx from "clsx";
import { getExcerpt } from "~/lib/utils";
import type { loader as productLoader } from "~/routes/($locale).products.$productHandle";

export function ProductDetails({ showShippingPolicy, showRefundPolicy }) {
  let { shop, product } = useLoaderData<typeof productLoader>();
  let { description } = product;
  let { shippingPolicy, refundPolicy } = shop;
  let details = [
    { title: "Description", content: description },
    showShippingPolicy &&
      shippingPolicy?.body && {
        title: "Shipping",
        content: getExcerpt(shippingPolicy.body),
        learnMore: `/policies/${shippingPolicy.handle}`,
      },
    showRefundPolicy &&
      refundPolicy?.body && {
        title: "Returns",
        content: getExcerpt(refundPolicy.body),
        learnMore: `/policies/${refundPolicy.handle}`,
      },
  ].filter(Boolean);

  return (
    <Accordion.Root type="multiple">
      {details.map(({ title, content, learnMore }) => (
        <Accordion.Item key={title} value={title}>
          <Accordion.Trigger
            className={clsx([
              "flex justify-between py-4 w-full font-bold",
              "border-b border-line-subtle",
              "[&>.minus]:data-[state=open]:inline-block",
              "[&>.plus]:data-[state=open]:hidden",
            ])}
          >
            <span>{title}</span>
            <Minus className="w-4 h-4 minus hidden" />
            <Plus className="w-4 h-4 plus" />
          </Accordion.Trigger>
          <Accordion.Content
            style={
              {
                "--slide-up-from": "var(--radix-accordion-content-height)",
                "--slide-down-to": "var(--radix-accordion-content-height)",
                "--slide-up-duration": "0.15s",
                "--slide-down-duration": "0.15s",
              } as React.CSSProperties
            }
            className={clsx([
              "overflow-hidden",
              "data-[state=closed]:animate-slide-up",
              "data-[state=open]:animate-slide-down",
            ])}
          >
            <div
              suppressHydrationWarning
              className="prose dark:prose-invert py-2.5"
              dangerouslySetInnerHTML={{ __html: content }}
            />
            {learnMore && (
              <Link
                className="pb-px border-b border-line-subtle text-body-subtle"
                to={learnMore}
              >
                Learn more
              </Link>
            )}
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}