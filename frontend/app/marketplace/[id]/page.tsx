import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, Badge, Card, CardHeader, Notice } from "@/app/components/ui";
import { ContactSeller } from "@/app/marketplace/ContactSeller";
import { FavoriteButton } from "@/app/marketplace/FavoriteButton";
import { Gallery } from "@/app/marketplace/Gallery";
import { MarketplaceTrustStrip } from "@/app/marketplace/MarketplaceTrustStrip";
import { PaySeller } from "@/app/marketplace/PaySeller";
import {
  brandGroupForListing,
  BRAND_THEME_CLASSES,
  CONDITION_LABEL,
  formatPrice,
  locationLabel,
  photoUrlsFor,
  sellerHandle,
  SHIPPING_LABEL,
} from "@/app/marketplace/lib";
import {
  getMarketListingByDocumentId,
  getSellerPaymentMethods,
  type MarketListing,
} from "@/lib/strapi";

type Props = {
  params: Promise<{ id: string }>;
};

const SpecRow = ({ label, value }: { label: string; value: string | null | undefined }) => {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm last:border-b-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
};

export default async function MarketplaceListingPage({ params }: Props) {
  const { id } = await params;
  const listing: MarketListing | null = await getMarketListingByDocumentId(id);
  if (!listing) {
    notFound();
  }

  const photos = photoUrlsFor(listing);
  const price = formatPrice(listing.priceUsd, listing.currency);
  const seller = sellerHandle(listing);
  const sellerId = listing.seller?.id ?? null;
  const paymentMethods = sellerId !== null ? await getSellerPaymentMethods(sellerId) : null;
  const hasPayMethods = Boolean(
    paymentMethods &&
      (paymentMethods.paypalHandle ||
        paymentMethods.venmoHandle ||
        paymentMethods.stripePaymentLinkUrl ||
        paymentMethods.acceptsCashOnPickup ||
        paymentMethods.ethAddress ||
        paymentMethods.solAddress ||
        paymentMethods.dotAddress ||
        paymentMethods.ksmAddress ||
        paymentMethods.btcAddress),
  );
  const conditionLabel = listing.condition ? CONDITION_LABEL[listing.condition] : null;
  const shippingLabel =
    listing.shipping && listing.shipping in SHIPPING_LABEL
      ? SHIPPING_LABEL[listing.shipping]
      : null;
  const shippingPrice = formatPrice(listing.shippingPriceUsd ?? null, listing.currency);
  const totalPrice =
    typeof listing.priceUsd === "number" && Number.isFinite(listing.priceUsd)
      ? listing.priceUsd + (listing.shippingPriceUsd ?? 0)
      : null;
  const totalLabel = formatPrice(totalPrice, listing.currency);
  const location = locationLabel(listing);
  const isInactive = listing.status && listing.status !== "active";
  const brandGroup = brandGroupForListing(listing);
  const brandClasses = brandGroup ? BRAND_THEME_CLASSES[brandGroup.theme] : null;

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link href="/marketplace" className="hover:text-slate-900">
          Marketplace
        </Link>
        <span>/</span>
        {brandGroup ? (
          <>
            <Link
              href={`/marketplace?group=${brandGroup.id}`}
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${brandClasses?.chip ?? ""}`}
            >
              {brandGroup.label}
            </Link>
            <span>/</span>
          </>
        ) : null}
        <span className="truncate text-slate-700">{listing.title}</span>
      </nav>

      {isInactive ? (
        <Notice variant="warn">
          This listing is no longer active ({listing.status}). It is shown for reference only.
        </Notice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <Gallery photos={photos} alt={listing.title} />

          <Card>
            <CardHeader title="Seller" />
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar label={seller ?? "Seller"} size="md" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {seller ? `@${seller}` : "Anonymous seller"}
                  </p>
                  {seller ? (
                    <Link
                      href={`/u/${seller}`}
                      className="text-xs text-slate-500 hover:text-slate-900"
                    >
                      View public profile
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>

          {!isInactive && sellerId !== null ? (
            <Card id="contact-seller" className="scroll-mt-24">
              <CardHeader title="Contact seller" />
              <ContactSeller
                listingDocumentId={id}
                sellerId={sellerId}
                sellerUsername={seller ?? ""}
                negotiable={Boolean(listing.negotiable)}
                askingPriceUsd={listing.priceUsd}
              />
            </Card>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card
            className={
              brandClasses
                ? `bg-gradient-to-br ${brandClasses.hero} border-transparent`
                : ""
            }
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  {brandGroup ? (
                    <Link
                      href={`/marketplace?group=${brandGroup.id}`}
                      className={`mb-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${brandClasses?.chip ?? ""}`}
                    >
                      {brandGroup.label} group
                    </Link>
                  ) : null}
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    {listing.title}
                  </h1>
                  {listing.discDisplayName ? (
                    <p className="mt-0.5 text-sm text-slate-600">{listing.discDisplayName}</p>
                  ) : null}
                </div>
                <FavoriteButton listingDocumentId={id} />
              </div>

              {price ? (
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-slate-900">{price}</p>
                  {listing.negotiable ? (
                    <Badge variant="info">Accepts offers</Badge>
                  ) : (
                    <Badge>Firm price</Badge>
                  )}
                </div>
              ) : null}

              {totalLabel && shippingPrice ? (
                <p className="text-xs text-slate-600">
                  Estimated total with shipping:{" "}
                  <span className="font-semibold text-slate-900">{totalLabel}</span>
                </p>
              ) : null}

              {!isInactive && sellerId !== null ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <a
                    href={hasPayMethods ? "#pay-seller" : "#contact-seller"}
                    className="inline-flex flex-1 items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                  >
                    {hasPayMethods ? "Buy now" : "Ask to buy"}
                  </a>
                  {listing.negotiable ? (
                    <a
                      href="#contact-seller"
                      className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                    >
                      Make offer
                    </a>
                  ) : null}
                  <a
                    href="#contact-seller"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                    aria-label="Message seller"
                  >
                    Message
                  </a>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-1.5">
                {conditionLabel ? <Badge variant="success">{conditionLabel}</Badge> : null}
                {listing.weightGrams ? <Badge>{listing.weightGrams}g</Badge> : null}
                {listing.plastic ? <Badge>{listing.plastic}</Badge> : null}
              </div>

              {listing.description ? (
                <p className="whitespace-pre-wrap text-sm text-slate-700">{listing.description}</p>
              ) : null}

              <dl className="rounded-xl border border-slate-200 bg-white/70 p-3 backdrop-blur-sm">
                <SpecRow label="Color / stamp" value={listing.colorStamp} />
                <SpecRow label="Plastic" value={listing.plastic} />
                <SpecRow
                  label="Weight"
                  value={listing.weightGrams ? `${listing.weightGrams}g` : null}
                />
                <SpecRow label="Shipping" value={shippingLabel} />
                <SpecRow label="Shipping cost" value={shippingPrice} />
                <SpecRow label="Location" value={location} />
                {listing.discDocumentId ? (
                  <div className="flex justify-between gap-4 py-2 text-sm">
                    <dt className="text-slate-500">Catalog</dt>
                    <dd>
                      <Link
                        href={`/discs/${listing.discDocumentId}`}
                        className="font-medium text-slate-900 underline hover:text-slate-700"
                      >
                        View disc page
                      </Link>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </Card>

          {!isInactive && hasPayMethods && paymentMethods ? (
            <Card id="pay-seller" className="scroll-mt-24">
              <CardHeader
                title="Pay seller"
                description="Choose how you'd like to send payment to this seller."
              />
              <PaySeller
                paypalHandle={paymentMethods.paypalHandle}
                venmoHandle={paymentMethods.venmoHandle}
                stripePaymentLinkUrl={paymentMethods.stripePaymentLinkUrl}
                acceptsCashOnPickup={paymentMethods.acceptsCashOnPickup}
                ethAddress={paymentMethods.ethAddress}
                solAddress={paymentMethods.solAddress}
                dotAddress={paymentMethods.dotAddress}
                ksmAddress={paymentMethods.ksmAddress}
                btcAddress={paymentMethods.btcAddress}
                cryptoNotes={paymentMethods.cryptoNotes}
                priceUsd={listing.priceUsd}
                shippingPriceUsd={listing.shippingPriceUsd ?? null}
                listingTitle={listing.title}
              />
            </Card>
          ) : !isInactive && sellerId !== null ? (
            <Card id="pay-seller" className="scroll-mt-24">
              <CardHeader
                title="Pay seller"
                description="The seller hasn't published payment handles yet — use the contact thread below the seller card."
              />
              <p className="text-sm text-slate-600">
                Once {seller ? `@${seller}` : "the seller"} adds PayPal, Venmo, Stripe, or a wallet
                address in their account, you can pay from this panel. Until then, reach out in the
                thread under their profile.
              </p>
            </Card>
          ) : null}
        </aside>
      </div>

      <MarketplaceTrustStrip />
    </div>
  );
}
