# fake-passport-bupt

真正的网页版北邮出入校通行证，自定义任何信息，与真实网页相同，随意检查。

每个请求均可以自定义`姓名`，`学院`，`学号`，`出入校类型`

示例：

<img src="readme_assets/example_screenshot.jpg" style="width: auto; height: 50%" />

## 使用方法

### 运行方法一：直接运行（使用`Node.js`）

1. 确保 `node` 已正常安装（需要`>14`），通过 `node --version` 检查是否安装成功

2. 进入本项目根目录，`npm install` 安装依赖
3. `chmod +x runner.sh; ./runner.sh start dev --verbose` 开始运行，你应该会看到控制台输出 `App listening at 10985`（`10985` 是默认端口）
4. 现在你可以在浏览器 `localhost:10985` 访问它。桌面端样式不对和字体不对是正常现象，因为学校官方网站也是这样的，真正的完全相同（笑，微信访问就正常了
5. 根据你的需要部署至你自己的服务器上（以便用手机移动网络访问），在服务器上运行时可以使用 `./runner.sh start dev --verbose --detach` 运行，方便在后台长期运行。

### 运行方法二：Docker 容器化

1. 确保安装了 `docker` 和 `docker-compose`
2. 进入在本项目的根目录
3. `docker-compose up --build --file docker-compose-general.yml --env-file .env` 来 build 并运行
    - 如果你的服务器上使用 `traefik` 反向代理，你可以使用默认的 docker-compose 配置，`docker-compose up --build `，记得在 `.env` 文件中的 `WEBSITE_URL` 说明你的域名和路由
4. 现在你可以在浏览器 `localhost:10985` 访问它。桌面端样式不对和字体不对是正常现象，因为学校官方网站也是这样的，真正的完全相同（笑，微信访问就正常了
5. 在服务器上部署时加上 `--detach` 参数即可在后台运行

### 开始使用

1. 建议部署在有公网 IP 服务器上，方便在外使用移动网络访问。以下所有网址均使用你自己服务器地址 or 域名
2. 参考下面的 API 说明，填好信息，在电脑浏览器（Chromium 内核）上打开你得到的URL（我们要把中文 escape 掉，不然微信不认）
3. 打开网页之后再复制一遍地址栏的URL，这时你的剪贴板里面会是 escape 过的 URL，它看起来像这样 `http://localhost:10985/?school=%E4%BD%A0%E7%9A%84%E5%AD%A6%E9%99%A2&type=%E5%85%A5/%E5%87%BA&id=%E4%BD%A0%E7%9A%84%E5%AD%A6%E5%8F%B7&name=%E4%BD%A0%E7%9A%84%E5%90%8D%E5%AD%97`
4. 把这串地址复制并发送给自己的手机微信
5. 用同样的方法生成自己的出校和入校的 URL
6. 完事👏👏 现在你可以在手机微信里打开刚刚的 URL 获取出入校通行证了

## API

请求参数

| 参数名称 | 含义                     |
| -------- | ------------------------ |
| name     | 你的名字                 |
| school   | 你的学院                 |
| type     | 出校或入校，填`出`或`入` |
| id       | 你的学号                 |

最终你的 URL 看起来会是这样：`http://localhost:10985/?school=你的学院&type=出&id=你的学号&name=你的名字`

