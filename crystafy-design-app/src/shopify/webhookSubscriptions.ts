import { shopifyGraphql } from './admin.js';

const WEBHOOK_SUBSCRIPTION_CREATE = /* GraphQL */ `
  mutation CreateOrdersCreateWebhook(
    $topic: WebhookSubscriptionTopic!
    $webhookSubscription: WebhookSubscriptionInput!
  ) {
    webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
      webhookSubscription {
        id
        topic
        uri
      }
      userErrors {
        field
        message
      }
    }
  }
`;

interface WebhookSubscriptionCreateResult {
  webhookSubscriptionCreate: {
    webhookSubscription: null | {
      id: string;
      topic: string;
      uri: string;
    };
    userErrors: Array<{ field?: string[]; message: string }>;
  };
}

export async function installOrdersCreateWebhook(uri: string) {
  const data = await shopifyGraphql<WebhookSubscriptionCreateResult>(WEBHOOK_SUBSCRIPTION_CREATE, {
    topic: 'ORDERS_CREATE',
    webhookSubscription: {
      uri,
      format: 'JSON',
    },
  });

  const errors = data.webhookSubscriptionCreate.userErrors;
  if (errors.length > 0) {
    const message = errors.map((error) => error.message).join('; ');
    if (/already|taken|exists/i.test(message)) {
      return {
        ok: true,
        alreadyExists: true,
        warning: message,
      };
    }
    throw new Error(message);
  }

  return {
    ok: true,
    webhook: data.webhookSubscriptionCreate.webhookSubscription,
  };
}
