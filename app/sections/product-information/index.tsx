import { useLoaderData, useSearchParams } from "@remix-run/react";
import { Money, ShopPayButton, useOptimisticVariant } from "@shopify/hydrogen";
import type { MoneyV2 } from "@shopify/hydrogen/storefront-api-types";
import type { HydrogenComponentSchema } from "@weaverse/hydrogen";
import { forwardRef, useEffect, useState } from "react";
import type { ProductQuery } from "storefrontapi.generated";
import { CompareAtPrice } from "~/components/compare-at-price";
import { Link } from "~/components/link";
import { Section, type SectionProps, layoutInputs } from "~/components/section";
import { isDiscounted, isNewArrival } from "~/lib/utils";
import { AddToCartButton } from "~/components/product/add-to-cart-button";
import { Button } from "~/components/button";
import { Swiper, type SwiperClass, SwiperSlide } from "swiper/react";
import {
  ProductMedia,
  type ProductMediaProps,
} from "~/components/product/product-media";
import { Quantity } from "~/components/product/quantity";
import { ProductVariants } from "~/components/product/variants";
import type { loader as productLoader } from "~/routes/($locale).products.$productHandle";
import { ProductDetails } from "./product-details";
import { fal } from "@fal-ai/client";

fal.config({
  credentials: "4991987c-466b-4c50-9563-e48d501705a2:b3516eec6064581ae59b766d6ce410a8"
});


async function convertToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject("Failed to convert");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface ProductInformationProps
  extends SectionProps,
    Omit<ProductMediaProps, "selectedVariant" | "media"> {
  addToCartText: string;
  soldOutText: string;
  unavailableText: string;
  showVendor: boolean;
  showSalePrice: boolean;
  showShortDescription: boolean;
  showShippingPolicy: boolean;
  showRefundPolicy: boolean;
  hideUnavailableOptions: boolean;
}

let ProductInformation = forwardRef<HTMLDivElement, ProductInformationProps>(
  (props, ref) => {
    let {
      product,
      variants: _variants,
      storeDomain,
    } = useLoaderData<typeof productLoader>();
    let variants = _variants?.product?.variants;
    let selectedVariantOptimistic = useOptimisticVariant(
      product?.selectedVariant || variants?.nodes?.[0],
      variants
    );
    let [selectedVariant, setSelectedVariant] = useState<any>(
      selectedVariantOptimistic
    );

    let {
      addToCartText,
      soldOutText,
      unavailableText,
      showVendor,
      showSalePrice,
      showShortDescription,
      showShippingPolicy,
      showRefundPolicy,
      hideUnavailableOptions,
      mediaLayout,
      gridSize,
      imageAspectRatio,
      showThumbnails,
      children,
      ...rest
    } = props;
    let [quantity, setQuantity] = useState<number>(1);
    let [searchParams] = useSearchParams();

    let atcText = selectedVariant?.availableForSale
      ? addToCartText
      : selectedVariant?.quantityAvailable === -1
      ? unavailableText
      : soldOutText;

    // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
    useEffect(() => {
      if (!selectedVariant && variants?.nodes?.[0]) {
        setSelectedVariant(variants?.nodes?.[0]);
      } else if (
        selectedVariantOptimistic?.id &&
        selectedVariantOptimistic.id !== selectedVariant?.id
      ) {
        setSelectedVariant(selectedVariantOptimistic);
      }
    }, [selectedVariantOptimistic?.id]);

    function handleSelectedVariantChange(variant: any) {
      setSelectedVariant(variant);
      console.log("VARIANT", variant)
      if (!variant?.selectedOptions) return;
      // update the url
      for (let option of variant.selectedOptions) {
        searchParams.set(option.name, option.value);
      }
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}?${searchParams.toString()}`
      );
    }

    // States for Try On functionality
    let [showTryOnPopup, setShowTryOnPopup] = useState(false);
    let [uploadedImage, setUploadedImage] = useState<File | null>(null);
    let [previewImageURL, setPreviewImageURL] = useState<string | null>(null);
    let [finalImageUrl, setFinalImageUrl] = useState<string | null>(null);
    let [isProcessing, setIsProcessing] = useState(false);

    // Reset final image whenever a new image is chosen
    useEffect(() => {
      if (uploadedImage) {
        setFinalImageUrl(null);
      }
    }, [uploadedImage]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setUploadedImage(file);
        setPreviewImageURL(URL.createObjectURL(file));
      }
    };

    const handleTryOn = async () => {
      if (!uploadedImage) return;
      setIsProcessing(true);
      
      try {
        const base64HumanImage = await convertToBase64(uploadedImage);
        console.log(selectedVariant.image.url)
        const result = await fal.subscribe("fashn/tryon", {
          input: {
            model_image: base64HumanImage, // Send Base64 image
            garment_image: "https://i.ibb.co/w6qrDXB/dress.png",
            category: "one-pieces",
          },
          logs: true,
          onQueueUpdate: (update: any) => {
            console.log(update);
            if (update.status === "IN_PROGRESS") {
              update.logs.map((log: any) => log.message).forEach(console.log);
            }
          },
        });

        console.log("REQUESTED");
        setFinalImageUrl(result.data.images[0].url); // Use the image URL from the response
      } catch (error) {
        console.error("Error during Try On:", error);
      } finally {
        setIsProcessing(false);
      }
    };


    if (product && variants) {
      let { title, vendor, summary } = product;
      let discountedAmount =
        (selectedVariant?.compareAtPrice?.amount || 0) /
          selectedVariant?.price?.amount -
        1;
      let isNew = isNewArrival(product.publishedAt);

      return (
        <Section ref={ref} {...rest} overflow="unset">
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="text-body-subtle hover:underline underline-offset-4"
            >
              Home
            </Link>
            <span>/</span>
            <span>{product.title}</span>
          </div>
          <div className="space-y-5 lg:space-y-0 lg:grid lg:gap-[clamp(30px,5%,60px)] lg:grid-cols-[1fr_clamp(360px,45%,480px)]">

          <ProductMedia
            mediaLayout={mediaLayout}
            gridSize={gridSize}
            imageAspectRatio={imageAspectRatio}
            showThumbnails={showThumbnails}
            selectedVariant={selectedVariant}
            media={[
              {
                __typename: "MediaImage",
                alt: selectedVariant?.image?.altText || "",
                id: selectedVariant?.id,
                image: {
                  url: selectedVariant?.image?.url,
                  width: selectedVariant?.image?.width,
                  height: selectedVariant?.image?.height,
                },
              },
              ...(product?.media.nodes || []),
            ]}
          />
            <div>
              <div
                className="sticky flex flex-col justify-start space-y-5"
                style={{ top: "calc(var(--height-nav) + 20px)" }}
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    {discountedAmount > 0 && discountedAmount < 1 && (
                      <span className="py-1.5 px-2 text-background bg-[--color-discount] rounded">
                        -{Math.round(discountedAmount * 100)}%
                      </span>
                    )}
                    {isNew && (
                      <span className="py-1.5 px-2 text-background bg-[--color-new-badge] rounded">
                        NEW ARRIVAL
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {showVendor && vendor && (
                      <span className="text-body-subtle">{vendor}</span>
                    )}
                    <h1 className="h3 !tracking-tight">{title}</h1>
                  </div>
                  {selectedVariant ? (
                    <div className="flex items-center gap-2">
                      <Money
                        withoutTrailingZeros
                        data={selectedVariant.price}
                        as="span"
                        className="font-medium text-2xl/none"
                      />
                      {isDiscounted(
                        selectedVariant.price as MoneyV2,
                        selectedVariant.compareAtPrice as MoneyV2
                      ) &&
                        showSalePrice && (
                          <CompareAtPrice
                            data={selectedVariant.compareAtPrice as MoneyV2}
                            className="text-2xl/none"
                          />
                        )}
                    </div>
                  ) : null}
                  {children}
                  {showShortDescription && (
                    <p className="leading-relaxed">{summary}</p>
                  )}
                  <ProductVariants
                    product={product as ProductQuery["product"]}
                    selectedVariant={selectedVariant}
                    onSelectedVariantChange={handleSelectedVariantChange}
                    variants={variants}
                    options={product?.options}
                    handle={product?.handle}
                    hideUnavailableOptions={hideUnavailableOptions}
                  />
                </div>
                <Quantity value={quantity} onChange={setQuantity} />
                <Button
                  className="w-full py-2 border border-black hover:bg-black hover:text-white transition"
                  onClick={() => setShowTryOnPopup(true)}
                  type="button"
                >
                  Try On
                </Button>
                <AddToCartButton
                  disabled={!selectedVariant?.availableForSale}
                  lines={[
                    {
                      merchandiseId: selectedVariant?.id,
                      quantity,
                      selectedVariant,
                    },
                  ]}
                  variant="primary"
                  data-test="add-to-cart"
                  className="w-full hover:border-black"
                >
                  {atcText}
                </AddToCartButton>
                {selectedVariant?.availableForSale && (
                  <ShopPayButton
                    width="100%"
                    variantIdsAndQuantities={[
                      {
                        id: selectedVariant?.id,
                        quantity,
                      },
                    ]}
                    storeDomain={storeDomain}
                  />
                )}
                <ProductDetails
                  showShippingPolicy={showShippingPolicy}
                  showRefundPolicy={showRefundPolicy}
                />
              </div>
            </div>
          </div>
          {/* Popup Modal */}
          {showTryOnPopup && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="relative bg-white rounded-lg p-4 w-full max-w-md mx-4 sm:mx-0 flex flex-col items-center">
                {/* Close Button */}
                <button
                  onClick={() => {
                    setShowTryOnPopup(false);
                    setUploadedImage(null);
                    setPreviewImageURL(null);
                    setFinalImageUrl(null);
                  }}
                  className="absolute top-2 right-2 text-black font-bold text-xl"
                  aria-label="Close"
                >
                  &times;
                </button>

                {finalImageUrl ? (
                  // Swiper with two images: first result, second uploaded image
                  <div className="w-full">
                    <Swiper spaceBetween={10} slidesPerView={1}>
                      <SwiperSlide>
                        <div className="flex items-center justify-center">
                          <img
                            src={finalImageUrl}
                            alt="Result Image"
                            className="object-contain max-h-[70vh]"
                          />
                        </div>
                      </SwiperSlide>
                      <SwiperSlide>
                        <div className="flex items-center justify-center">
                          {previewImageURL && (
                            <img
                              src={previewImageURL}
                              alt="Uploaded Image"
                              className="object-contain max-h-[70vh]"
                            />
                          )}
                        </div>
                      </SwiperSlide>
                    </Swiper>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-4 w-full">
                    {/* If no uploaded image, show text. Else show preview image */}
                    {!uploadedImage ? (
                      <p className="text-center mt-8">Upload a full body of yourself</p>
                    ) : (
                      <div className="flex items-center justify-center">
                        <img
                          src={previewImageURL || ""}
                          alt="Preview"
                          className="object-contain max-h-[50vh]"
                        />
                      </div>
                    )}

                    <label className="w-full text-center">
                      <div className="inline-block px-4 py-2 border border-black cursor-pointer hover:bg-black hover:text-white transition">
                        Upload image
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </label>

                    <button
                      onClick={handleTryOn}
                      disabled={!uploadedImage || isProcessing}
                      className={`px-4 py-2 border border-black ${
                        !uploadedImage || isProcessing
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-black hover:text-white transition"
                      }`}
                    >
                      {isProcessing ? "Processing..." : "Try On"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </Section>
      );
    }
    return <div ref={ref} {...rest} />;
  }
);

export default ProductInformation;

export let schema: HydrogenComponentSchema = {
  type: "product-information",
  title: "Main product",
  childTypes: ["judgeme"],
  limit: 1,
  enabledOn: {
    pages: ["PRODUCT"],
  },
  inspector: [
    { group: "Layout", inputs: layoutInputs },
    {
      group: "Product Media",
      inputs: [
        {
          type: "toggle-group",
          name: "mediaLayout",
          label: "Media layout",
          configs: {
            options: [
              {
                label: "Grid",
                value: "grid",
                icon: "grid-2x2",
              },
              {
                label: "Slider",
                value: "slider",
                icon: "slideshow-outline",
              },
            ],
          },
          defaultValue: "grid",
        },
        {
          type: "select",
          name: "gridSize",
          label: "Grid size",
          defaultValue: "2x2",
          configs: {
            options: [
              { label: "1x1", value: "1x1" },
              { label: "2x2", value: "2x2" },
              { label: "Mix", value: "mix" },
            ],
          },
          condition: "mediaLayout.eq.grid",
        },
        {
          label: "Show thumbnails",
          name: "showThumbnails",
          type: "switch",
          defaultValue: true,
          condition: "mediaLayout.eq.slider",
        },
        {
          type: "select",
          name: "imageAspectRatio",
          label: "Aspect ratio",
          defaultValue: "adapt",
          configs: {
            options: [
              { value: "adapt", label: "Adapt to image" },
              { value: "1/1", label: "Square (1/1)" },
              { value: "3/4", label: "Portrait (3/4)" },
              { value: "4/3", label: "Landscape (4/3)" },
              { value: "16/9", label: "Widescreen (16/9)" },
            ],
          },
        },
      ],
    },
    {
      group: "Product information",
      inputs: [
        {
          type: "text",
          label: "Add to cart text",
          name: "addToCartText",
          defaultValue: "Add to cart",
          placeholder: "Add to cart",
        },
        {
          type: "text",
          label: "Sold out text",
          name: "soldOutText",
          defaultValue: "Sold out",
          placeholder: "Sold out",
        },
        {
          type: "text",
          label: "Unavailable text",
          name: "unavailableText",
          defaultValue: "Unavailable",
          placeholder: "Unavailable",
        },
        {
          type: "switch",
          label: "Show vendor",
          name: "showVendor",
          defaultValue: false,
        },
        {
          type: "switch",
          label: "Show sale price",
          name: "showSalePrice",
          defaultValue: true,
        },
        {
          type: "switch",
          label: "Show short description",
          name: "showShortDescription",
          defaultValue: true,
        },
        {
          type: "switch",
          label: "Show shipping policy",
          name: "showShippingPolicy",
          defaultValue: true,
        },
        {
          type: "switch",
          label: "Show refund policy",
          name: "showRefundPolicy",
          defaultValue: true,
        },
        {
          label: "Hide unavailable options",
          type: "switch",
          name: "hideUnavailableOptions",
          defaultValue: false,
        },
      ],
    },
  ],
  presets: {
    width: "stretch",
    mediaLayout: "grid",
    gridSize: "2x2",
  },
};
