# Crystafy Design App

Crystafy 定制手串后端项目。

目标：把 DIY 页面生成的手串 Design 转换成 Shopify Design Product，并为订单、内部交付、库存扣减和后续分析保留结构化数据。

## 当前阶段

当前版本已经包含：

- Design 数据接收接口
- Shopify Admin GraphQL 客户端
- Design Product 创建服务
- Design 预览图上传到 Shopify 并作为商品主图
- Design Product 价格、SKU、metafields 写入
- 返回 Shopify 购物车可用的 `variantNumericId`
- App Proxy 签名校验预留
- Webhook 签名校验预留
- 本地 Design 数据落盘，方便开发调试

## 本地启动

```powershell
cd "E:\桌面\网站公司\Crystafy\代码修改\crystafy-0.0.1\crystafy-0.0.1\crystafy-design-app"
npm install
Copy-Item .env.example .env
npm run dev
```

打开：

```text
http://127.0.0.1:8787/health
```

## 主要接口

### 健康检查

```text
GET /health
```

### 创建 Design Product

```text
POST /api/designs/create-product
```

本地测试时可以先使用 `ALLOW_UNVERIFIED_LOCAL_REQUESTS=true`。
正式上线时必须关闭，并通过 Shopify App Proxy 验证请求签名。

### 订单 Webhook

```text
POST /webhooks/orders-create
```

正式上线后用于监听 Shopify 订单创建事件，再处理库存扣减和 Design 数据绑定。

## Shopify App 必要设置

Admin API scopes 至少需要：

```text
read_products,write_products,read_files,write_files,read_metaobject_definitions,write_metaobject_definitions,read_metaobjects,write_metaobjects,read_orders,write_orders,read_inventory,write_inventory,read_publications,write_publications
```

其中 `read_publications,write_publications` 用于把自动生成的 Design Product 发布到 Online Store。没有这两个权限时，商品仍能创建，但不能保证可以被顾客加入购物车。

App Proxy 建议：

```text
Subpath prefix: apps
Subpath: crystafy-design
Proxy URL: https://你的后端域名
```

前端会请求：

```text
/apps/crystafy-design/api/designs/create-product
```

## 下一步

1. 给 Shopify App 补 `read_publications,write_publications`，重新 Release / Install。
2. 部署后端到公网 HTTPS 域名。
3. 在 App Proxy 填入公网域名。
4. 上传新版主题文件，测试 Finalize 创建商品并加入购物车。
5. 接入订单 Webhook 与库存扣减。
