import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export const getStripe = () => {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
        throw new Error("STRIPE_SECRET_KEY is not defined");
    }

    if (!stripeClient) {
        stripeClient = new Stripe(secretKey);
    }

    return stripeClient;
};