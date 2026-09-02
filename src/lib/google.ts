import { OAuth2Client } from "google-auth-library";

let googleClient: OAuth2Client | null = null;

export const getGoogleClient = () => {
    if (!googleClient) {
        googleClient = new OAuth2Client();
    }

    return googleClient;
};