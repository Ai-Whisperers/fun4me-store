/**
 * Mock Payment Provider
 * 
 * Implementation of PaymentProvider for testing and development.
 */

import { AbstractPaymentProvider } from './abstract-provider'

import type { 

  PaymentIntent, 

  CreatePaymentIntentOptions, 

  ProviderResult,

  WebhookEvent

} from './types'



export class MockPaymentProvider extends AbstractPaymentProvider {

  readonly name = 'mock'



  protected async doCreatePaymentIntent(options: CreatePaymentIntentOptions): Promise<PaymentIntent> {

    return {

      id: `mock_pi_${Math.random().toString(36).slice(2)}`,

      clientSecret: `mock_secret_${Math.random().toString(36).slice(2)}`,

      amount: options.amount,

      currency: options.currency,

      status: 'requires_payment_method',

      metadata: options.metadata,

      provider: 'mock',

    }

  }



  protected async doGetPaymentIntent(intentId: string): Promise<PaymentIntent> {

    return {

      id: intentId,

      clientSecret: 'mock_secret_static',

      amount: 1000,

      currency: 'PYG',

      status: 'succeeded',

      provider: 'mock',

    }

  }



  protected async doRefund(paymentIntentId: string, amount?: number, reason?: string): Promise<{ refundId: string }> {

    return { refundId: `mock_re_${Math.random().toString(36).slice(2)}` }

  }



    async verifyWebhook(payload: string | Buffer | Record<string, unknown>, signature: string, secret: string): Promise<ProviderResult<WebhookEvent>> {



      return {



        success: true,



        data: {



          id: `mock_evt_${Date.now()}`,



          type: 'payment_intent.succeeded',



          data: {



            object: payload as Record<string, unknown>



          }



        },



      }



    }



  

}
