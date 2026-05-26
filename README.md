# 坦克大战

一个基于 HTML Canvas 的简单坦克大战小游戏，不需要构建工具，直接打开 `index.html` 就能运行。

## 玩法
- 使用 `W/A/S/D` 或方向键控制玩家坦克移动
- 按 `Space` 发射子弹
- 消灭全部敌方坦克即可获胜
- 被敌方子弹命中会损失 1 点生命，并短暂回到出生点无敌

## 本地运行
直接用浏览器打开 `index.html` 即可。

如果你更想通过本地静态服务器运行，也可以在当前目录执行：

```bash
python -m http.server 8000
```

然后访问 `http://localhost:8000`。

## 文件说明
- `index.html`：页面结构与 HUD
- `style.css`：界面样式
- `main.js`：游戏循环、碰撞、敌人 AI、胜负逻辑

## 在线试玩
部署完成后可通过 GitHub Pages 访问：

- https://zhiyu-jy.github.io/tank-battle-html/

## 后续可扩展方向
- 多关卡地图
- 音效与爆炸动画
- 更智能的敌人 AI
- GitHub Pages 在线试玩
