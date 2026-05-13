import "server-only";

import Stripe from "stripe";

import { getStripeSecretKey } from "@/lib/env";
import type { Business, PaymentType } from "@/lib/types";

let stripeClient: Stripe | null = null;

type PaymentLinkResult = {
  url: string;
  paymentLinkId: string;
  productId: string;
  priceId: string;
  amount: number;
  paymentType: PaymentType;
};

function getStripeClient() {
  if (!stripeClient) {
    stripeClient = new Stripe(getStripeSecretKey());
  }

  return stripeClient;
}

export async function createServicePaymentLink(business: Business, paymentType: PaymentType): Promise<PaymentLinkResult> {
  return paymentType === "maintenance" ? createMaintenancePaymentLink(business) : createSetupPaymentLink(business);
}

export async function deactivateStripePaymentLink(paymentLinkId: string) {
  const stripe = getStripeClient();
  await stripe.paymentLinks.update(paymentLinkId, { active: false });
}

async function createSetupPaymentLink(business: Business): Promise<PaymentLinkResult> {
  const stripe = getStripeClient();

  const product = await stripe.products.create({
    name: `Website setup for ${business.name}`,
    description: "One-time human-reviewed local business website setup service.",
    metadata: {
      business_id: business.id,
      payment_type: "setup",
    },
  });

  const price = await stripe.prices.create({
    currency: "usd",
    unit_amount: 29900,
    product: product.id,
  });

  const link = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    metadata: {
      business_id: business.id,
      service: "website_setup",
      payment_type: "setup",
    },
  });

  return {
    url: link.url,
    paymentLinkId: link.id,
    productId: product.id,
    priceId: price.id,
    amount: 29900,
    paymentType: "setup",
  };
}

async function createMaintenancePaymentLink(business: Business): Promise<PaymentLinkResult> {
  const stripe = getStripeClient();

  const product = await stripe.products.create({
    name: `Monthly website maintenance for ${business.name}`,
    description: "Optional monthly maintenance subscription for ongoing website updates and support.",
    metadata: {
      business_id: business.id,
      payment_type: "maintenance",
    },
  });

  const price = await stripe.prices.create({
    currency: "usd",
    unit_amount: 4900,
    recurring: { interval: "month" },
    product: product.id,
  });

  const link = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    metadata: {
      business_id: business.id,
      service: "website_maintenance",
      payment_type: "maintenance",
    },
  });

  return {
    url: link.url,
    paymentLinkId: link.id,
    productId: product.id,
    priceId: price.id,
    amount: 4900,
    paymentType: "maintenance",
  };
}
