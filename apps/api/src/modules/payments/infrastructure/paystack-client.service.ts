import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PaystackInitializeResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export interface PaystackVerifyResult {
  status: 'success' | 'failed' | 'abandoned' | string;
  reference: string;
  amountKobo: number;
  paidAt: string | null;
  raw: unknown;
}

// Thin wrapper over Paystack's REST API using Node's built-in fetch (no
// axios dependency needed — apps/api's engines.node >=20 already has fetch
// natively, and this is only 2-3 calls). No live Paystack test key exists
// in this environment, so this is unit-testable via a mocked fetch but not
// end-to-end verified against the real API here — see the Phase 2 report.
@Injectable()
export class PaystackClientService {
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(private readonly config: ConfigService) {}

  private getSecretKey(): string {
    const key = this.config.get<string>('PAYSTACK_SECRET_KEY');
    if (!key) {
      throw new InternalServerErrorException(
        'PAYSTACK_SECRET_KEY is not configured — payments are unavailable on this environment',
      );
    }
    return key;
  }

  /**
   * §3.5: card, bank transfer and USSD channels — transfer will be the
   * majority in this market, so it's never omitted even though it's not
   * Paystack's channel default.
   */
  async initialize(params: {
    email: string;
    amountKobo: number;
    reference: string;
    callbackUrl?: string;
  }): Promise<PaystackInitializeResult> {
    const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.getSecretKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        amount: params.amountKobo,
        reference: params.reference,
        currency: 'NGN',
        channels: ['card', 'bank_transfer', 'ussd'],
        callback_url: params.callbackUrl,
      }),
    });

    const body = (await response.json()) as {
      status: boolean;
      message: string;
      data?: {
        authorization_url: string;
        access_code: string;
        reference: string;
      };
    };

    if (!response.ok || !body.status || !body.data) {
      throw new InternalServerErrorException(
        `Paystack initialize failed: ${body.message ?? response.statusText}`,
      );
    }

    return {
      authorizationUrl: body.data.authorization_url,
      accessCode: body.data.access_code,
      reference: body.data.reference,
    };
  }

  /**
   * The explicit server-side verify call the brief requires as one of the
   * two legitimate ways entitlement gets granted (the other being the
   * webhook) — "never by the browser redirect."
   */
  async verify(reference: string): Promise<PaystackVerifyResult> {
    const response = await fetch(
      `${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${this.getSecretKey()}` } },
    );

    const body = (await response.json()) as {
      status: boolean;
      message: string;
      data?: {
        status: string;
        reference: string;
        amount: number;
        paid_at: string | null;
      };
    };

    if (!response.ok || !body.status || !body.data) {
      throw new InternalServerErrorException(
        `Paystack verify failed: ${body.message ?? response.statusText}`,
      );
    }

    return {
      status: body.data.status,
      reference: body.data.reference,
      amountKobo: body.data.amount,
      paidAt: body.data.paid_at,
      raw: body,
    };
  }
}
