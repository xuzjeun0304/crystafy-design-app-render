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
