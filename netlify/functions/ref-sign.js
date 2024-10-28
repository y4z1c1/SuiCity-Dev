import nacl from "tweetnacl";
import { bytesToHex } from "@noble/hashes/utils";
import { TextEncoder } from "util";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Helper function to decode a hex-encoded string into a Uint8Array
function decodeHexString(hex) {
  return Uint8Array.from(Buffer.from(hex, "hex"));
}

export const handler = async (event, context) => {
  console.log("Sign Reference Claim function invoked");

  try {
    const { currentWalletAddress, referenceWalletAddress, currentNonce } =
      JSON.parse(event.body);

    if (!currentWalletAddress || !referenceWalletAddress) {
      console.error("Missing required fields");
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    console.log("Current Wallet Address:", currentWalletAddress);
    console.log("Reference Wallet Address:", referenceWalletAddress);
    console.log("Current Nonce:", currentNonce);

    // Prepare the raw message to sign (concatenate relevant fields)
    const message = `${currentWalletAddress}:${referenceWalletAddress}:${currentNonce}`;
    const messageBytes = new TextEncoder().encode(message); // Encode message as Uint8Array
    console.log("Raw message to sign:", message);

    // Retrieve the Ed25519 private key and public key from environment variables
    const privateKeyHex = process.env.PRIVATE_KEY;
    const publicKeyHex = process.env.PUBLIC_KEY;

    if (!privateKeyHex || !publicKeyHex) {
      console.error("Private/Public key not found in environment variables");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Server error: missing keys" }),
      };
    }

    // Convert the private key and public key from hex string to Uint8Array
    const privateKeyBytes = decodeHexString(privateKeyHex);
    const publicKeyBytes = decodeHexString(publicKeyHex);

    console.log("Private key size:", privateKeyBytes.length); // Should be 32 bytes
    console.log("Public key size:", publicKeyBytes.length); // Should be 32 bytes

    if (privateKeyBytes.length !== 32 || publicKeyBytes.length !== 32) {
      throw new Error(
        "Invalid key size. Private and public keys must be 32 bytes each."
      );
    }

    // Combine the 32-byte private key and 32-byte public key into a single 64-byte key
    const combinedKey = new Uint8Array(64);
    combinedKey.set(privateKeyBytes);
    combinedKey.set(publicKeyBytes, 32); // Set public key after private key

    // Sign the message using Ed25519 with the combined 64-byte key
    const signature = nacl.sign.detached(messageBytes, combinedKey);

    console.log("Signature:", signature);

    // Convert signature and message to hex for return
    const hexSign = bytesToHex(signature);

    // Return the raw message and hex signature to the frontend
    return {
      statusCode: 200,
      body: JSON.stringify({
        message,
        hexSign,
        publicKey: publicKeyHex,
      }),
    };
  } catch (error) {
    console.error("Error handling reference claim:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};
