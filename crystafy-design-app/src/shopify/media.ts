import { shopifyGraphql } from './admin.js';

const STAGED_UPLOADS_CREATE = /* GraphQL */ `
  mutation CreateStagedUpload($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets {
        url
        resourceUrl
        parameters {
          name
          value
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

interface StagedUploadsCreateResult {
  stagedUploadsCreate: {
    stagedTargets: Array<{
      url: string;
      resourceUrl: string;
      parameters: Array<{ name: string; value: string }>;
    }>;
    userErrors: Array<{ field?: string[]; message: string }>;
  };
}

interface ParsedDataUrl {
  mimeType: string;
  bytes: Buffer;
  extension: string;
}

function parseDataUrl(dataUrl: string): ParsedDataUrl {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) throw new Error('Preview image is not a base64 data URL');

  const mimeType = match[1];
  const bytes = Buffer.from(match[2], 'base64');
  const extension =
    mimeType === 'image/png' ? 'png' :
    mimeType === 'image/jpeg' ? 'jpg' :
    mimeType === 'image/webp' ? 'webp' :
    'bin';

  return { mimeType, bytes, extension };
}

export async function uploadPreviewImageDataUrl(
  dataUrl: string,
  designId: string,
): Promise<string> {
  const image = parseDataUrl(dataUrl);
  const filename = `${designId.toLowerCase()}-preview.${image.extension}`;

  const data = await shopifyGraphql<StagedUploadsCreateResult>(STAGED_UPLOADS_CREATE, {
    input: [
      {
        resource: 'IMAGE',
        filename,
        mimeType: image.mimeType,
        fileSize: String(image.bytes.length),
        httpMethod: 'POST',
      },
    ],
  });

  const errors = data.stagedUploadsCreate.userErrors;
  if (errors.length > 0) {
    throw new Error(errors.map((error) => error.message).join('; '));
  }

  const target = data.stagedUploadsCreate.stagedTargets[0];
  if (!target?.url || !target.resourceUrl) {
    throw new Error('Shopify did not return a staged upload target');
  }

  const form = new FormData();
  for (const parameter of target.parameters) {
    form.append(parameter.name, parameter.value);
  }
  form.append('file', new Blob([image.bytes], { type: image.mimeType }), filename);

  const uploadRes = await fetch(target.url, {
    method: 'POST',
    body: form,
  });

  if (!uploadRes.ok) {
    const message = await uploadRes.text().catch(() => uploadRes.statusText);
    throw new Error(`Shopify staged upload failed: ${message}`);
  }

  return target.resourceUrl;
}
