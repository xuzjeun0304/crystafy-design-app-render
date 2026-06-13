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

async function installWebhook(topic: string, uri: string) {
  const data = await shopifyGraphql<WebhookSubscriptionCreateResult>(WEBHOOK_SUBSCRIPTION_CREATE, {
    topic,
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

export async function installCoreWebhooks(baseUrl: string) {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const targets = [
    {
      name: 'orders-create',
      topic: 'ORDERS_CREATE',
      uri: `${cleanBase}/webhooks/orders-create`,
    },
    {
      name: 'orders-fulfilled',
      topic: 'ORDERS_FULFILLED',
      uri: `${cleanBase}/webhooks/orders-fulfilled`,
    },
  ];

  const results = [];
  for (const target of targets) {
    try {
      results.push({
        name: target.name,
        topic: target.topic,
        ...(await installWebhook(target.topic, target.uri)),
      });
    } catch (error) {
      results.push({
        name: target.name,
        topic: target.topic,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    ok: results.every((result) => result.ok),
    webhooks: results,
  };
}

export async function installOrdersCreateWebhook(uri: string) {
  return installWebhook('ORDERS_CREATE', uri);
}
