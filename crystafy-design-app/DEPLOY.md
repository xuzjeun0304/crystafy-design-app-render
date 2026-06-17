# Crystafy Design App 正式部署步骤

## 1. 部署到 Render

推荐使用 Render Web Service。

如果手动创建服务：

```text
Root Directory: crystafy-design-app
Build Command: npm install && npm run build
Start Command: npm run start
Health Check Path: /health
```

环境变量填写：

```text
NODE_ENV=production
PORT=10000
SHOPIFY_SHOP_DOMAIN=crystafy.myshopify.com
SHOPIFY_CLIENT_ID=你的新 App Client ID
SHOPIFY_CLIENT_SECRET=你的新 App Secret
SHOPIFY_API_VERSION=2026-04
SHOPIFY_API_SECRET=可以留空；留空时使用 SHOPIFY_CLIENT_SECRET 校验 App Proxy
APP_BASE_URL=https://你的-render域名
CRYSTAFY_SETUP_TOKEN=自己设置一串密码，只用来安装 webhook
SHOPIFY_INVENTORY_LOCATION_ID=可以留空；留空时自动使用有库存的地点
DEDUCT_BEAD_INVENTORY_ON_ORDER=true
RESTOCK_BEAD_INVENTORY_ON_CANCEL=true
ARCHIVE_DESIGN_PRODUCTS_ON_FULFILLMENT=true
ALLOW_DESIGN_PRODUCT_DELETE=false
AUTO_CLEANUP_ARCHIVED_DESIGNS=false
AUTO_CLEANUP_OLDER_THAN_DAYS=30
AUTO_CLEANUP_INTERVAL_HOURS=24
AUTO_CLEANUP_LIMIT=250
DESIGN_ANALYTICS_WEBHOOK_URL=可以留空；如需同步飞书/表格/BI，填对方接收 JSON 的 webhook
DESIGN_ANALYTICS_WEBHOOK_TOKEN=可以留空；如对方 webhook 需要 Bearer Token 再填写
NOCODB_DESIGN_SYNC_ENABLED=false
NOCODB_API_URL=https://ops.crystafy.com
NOCODB_API_TOKEN=可以留空；接 NocoDB 时填写客户 NocoDB API Token
NOCODB_DESIGNS_TABLE_ID=可以留空；接 NocoDB 时填写 Designs 表 table id
DESIGN_PRODUCT_STATUS=ACTIVE
PUBLISH_DESIGN_PRODUCTS=true
DESIGN_PRODUCT_TYPE=Custom Bracelet
DESIGN_PRODUCT_VENDOR=Crystafy
DESIGN_PRODUCT_TAGS=custom-design,hidden-design-product
ALLOW_UNVERIFIED_LOCAL_REQUESTS=false
DRY_RUN_CREATE_PRODUCT=false
```

部署成功后，打开：

```text
https://你的-render域名/health
```

能看到 `ok: true` 就代表后端上线成功。

## 2.1 安装订单库存扣减 Webhook

Render 部署完成后，打开：

```text
https://你的-render域名/api/admin/install-webhooks?token=你的CRYSTAFY_SETUP_TOKEN
```

看到 `ok: true` 后，代表 Shopify 已经会在新订单创建时通知后端。

这个安装链接会安装三个 webhook：

```text
ORDERS_CREATE：新订单创建后按 SKU 清单扣散珠库存
ORDERS_FULFILLED：订单履约完成后把对应 Design Product 自动归档
ORDERS_CANCELLED：订单取消后按 SKU 清单回补散珠库存
```

这些 webhook 只处理 Design Product 订单行，不会影响普通商品。

## 2. 配置 Shopify App Proxy

进入 Shopify Dev Dashboard：

```text
Crystafy Design Product Store > Versions > Create version
```

App Proxy 填：

```text
Subpath prefix: apps
Subpath: crystafy-design
Proxy URL: https://你的-render域名
```

Release 新版本，然后在 Shopify 店铺后台重新安装/更新授权 App。

## 3. 上传主题文件

至少需要上传：

```text
sections/diy-bracelet-3d.liquid
assets/diy3d.js
assets/diy3d.css
assets/diy3d-app-*.js
assets/diy3d-vendor-*.js
assets/diy3d-BraceletStage-*.js
assets/diy3d-rolldown-runtime-CWHJefYL.js
```

其中 `assets/diy3d.js` 里引用的 hash 文件名必须和后台 assets 中的文件名一致。

## 4. 测试流程

打开线上 DIY 页面：

```text
https://www.crystafy.com/pages/diy-designer
```

测试：

```text
添加珠子 > Finalize > 创建 Design Product > 自动加入购物车
```

如果失败，优先检查：

```text
1. Render /health 是否正常
2. Shopify App Proxy URL 是否是 HTTPS
3. App 是否已重新安装并授权最新 scopes
4. 浏览器控制台是否有 401/403/500
```

## 5. Design 数据分析接口

查看最近 Design Product 数据：

```text
https://你的-render域名/api/admin/designs?token=你的CRYSTAFY_SETUP_TOKEN
```

查看可视化管理页面：

```text
https://你的-render域名/api/admin/designs/report?token=你的CRYSTAFY_SETUP_TOKEN
```

下载 CSV：

```text
https://你的-render域名/api/admin/designs/export.csv?token=你的CRYSTAFY_SETUP_TOKEN
```

CSV 可导入 Excel / 飞书，包含 Design ID、创建时间、总价、手围、SKU 清单、珠子中文清单、图片链接等字段。

如果需要自动同步到飞书、Google Sheet 或其他 BI 系统，可以让对方提供一个接收 JSON 的 webhook，然后在 Render 添加：

```text
DESIGN_ANALYTICS_WEBHOOK_URL=https://对方-webhook-url
DESIGN_ANALYTICS_WEBHOOK_TOKEN=如果对方需要鉴权才填写
```

系统会在每条 Design Product 创建后推送：Design ID、设计名、价格、手围、总颗数、截图 URL、Product ID、Variant ID、SKU、中文名、数量、单价等数据。

## 5.1 同步到 NocoDB / ops.crystafy.com

客户如果使用 `ops.crystafy.com` 的 NocoDB 多维表格，可以创建一个新的 Designs 表，然后在 Render 添加：

```text
NOCODB_DESIGN_SYNC_ENABLED=true
NOCODB_API_URL=https://ops.crystafy.com
NOCODB_API_TOKEN=客户 NocoDB API Token
NOCODB_DESIGNS_TABLE_ID=Designs 表的 table id
```

建议 Designs 表字段：

```text
Design ID
Design Name
Created At
Source
Wrist Size cm
Total Price
Currency
Bead Count
Preview Image URL
Shopify Product ID
Shopify Product Numeric ID
Shopify Variant ID
Shopify Variant Numeric ID
Shopify Handle
SKU Summary
Bead Summary
Chinese Sequence
Sequence Code
Logo Palette
Beads JSON
```

检查配置是否完整：

```text
https://你的-render域名/api/admin/nocodb/status?token=你的CRYSTAFY_SETUP_TOKEN
```

说明：NocoDB 同步失败只会在接口返回 warnings，不会阻断 Shopify Design Product 创建和下单。

## 6. Design Product 清理机制

查看可清理的已归档 Design Product：

```text
https://你的-render域名/api/admin/designs/cleanup?token=你的CRYSTAFY_SETUP_TOKEN&olderThanDays=30
```

默认只预览，不会删除。

如需允许删除，在 Render 环境变量中设置：

```text
ALLOW_DESIGN_PRODUCT_DELETE=true
```

然后在清理页面输入：

```text
DELETE_ARCHIVED_DESIGNS
```

才会真正删除。安全规则：只删除 `ARCHIVED` 且超过指定天数的 Design Product。

如果需要自动定期清理，在 Render 环境变量中设置：

```text
AUTO_CLEANUP_ARCHIVED_DESIGNS=true
ALLOW_DESIGN_PRODUCT_DELETE=true
AUTO_CLEANUP_OLDER_THAN_DAYS=30
AUTO_CLEANUP_INTERVAL_HOURS=24
AUTO_CLEANUP_LIMIT=250
```

说明：自动清理只会处理已经 `ARCHIVED` 且超过指定天数的 Design Product，不会删除普通商品。
