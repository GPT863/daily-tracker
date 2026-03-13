# 前端部署到自己的服务器

这个前端项目是纯静态站，不需要 Node.js 或 .NET 运行时。最简单稳定的做法是：

1. 服务器安装 `nginx`
2. 上传前端静态文件到站点目录
3. 用 `nginx` 提供访问
4. 如果有域名，再补 HTTPS

## 需要上传的文件

把下面这些文件和目录上传到服务器：

- `index.html`
- `app.js`
- `style.css`
- `manifest.json`
- `sw.js`
- `icons/`

建议上传到：

```bash
/var/www/daily-tracker
```

## 方式一：Ubuntu / Debian 服务器

### 1. 安装 Nginx

```bash
sudo apt update
sudo apt install -y nginx
```

### 2. 创建站点目录

```bash
sudo mkdir -p /var/www/daily-tracker
sudo chown -R $USER:$USER /var/www/daily-tracker
```

### 3. 上传前端文件

在本地执行：

```bash
scp -r index.html app.js style.css manifest.json sw.js icons root@你的服务器IP:/var/www/daily-tracker/
```

### 4. 安装站点配置

把 [deploy/nginx/daily-tracker.conf](/d:/18健康记录daily-tracker/deploy/nginx/daily-tracker.conf) 放到服务器：

```bash
sudo cp /path/to/daily-tracker.conf /etc/nginx/sites-available/daily-tracker.conf
sudo ln -sf /etc/nginx/sites-available/daily-tracker.conf /etc/nginx/sites-enabled/daily-tracker.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 5. 浏览器访问

```text
http://你的服务器IP
```

## 方式二：CentOS / Rocky / AlmaLinux

### 1. 安装 Nginx

```bash
sudo yum install -y epel-release
sudo yum install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 2. 上传文件和配置

站点目录同样用：

```bash
/var/www/daily-tracker
```

配置文件路径改为：

```bash
/etc/nginx/conf.d/daily-tracker.conf
```

然后执行：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 一键发布脚本

如果你已经把文件传到服务器，可以在服务器上执行：

```bash
chmod +x deploy/frontend/deploy-frontend.sh
sudo bash deploy/frontend/deploy-frontend.sh
```

这个脚本会：

- 创建 `/var/www/daily-tracker`
- 复制前端静态文件
- 安装 Nginx 配置
- 重载 Nginx

## 云同步功能说明

当前前端里的“云同步”不是自动跟当前域名走，它依赖用户在页面里填写一个后端地址。

默认值在 [app.js](/d:/18健康记录daily-tracker/app.js) 里还是：

```text
http://170.106.101.55:8081
```

所以：

- 仅部署前端时，本地记录功能可以正常用
- 云同步功能只有在后端也部署完成后才可用
- 生产环境建议后端改成 HTTPS 地址

## HTTPS

如果你有域名，建议再执行：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d 你的域名
```

## 更新前端

以后前端更新时，只需要重新上传这些静态文件，然后执行：

```bash
sudo systemctl reload nginx
```

如果你希望我继续帮你做下一步，我可以直接给你：

- 适用于你服务器系统的完整命令
- 带你把域名和 HTTPS 一起配完
- 或者按你的服务器 IP / 用户名生成一份可直接执行的上传命令
